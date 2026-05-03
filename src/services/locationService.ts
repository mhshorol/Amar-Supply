import Fuse from 'fuse.js';
import { allLocations, LocationNode, divisions, districts, upazilas } from '../data/bangladesh-locations';

const fuseOptions = {
  keys: ['nameEn', 'nameBn'],
  threshold: 0.4,
  includeScore: true,
  distance: 100,
};

const fuse = new Fuse(allLocations, fuseOptions);

export interface ParsedAddress {
  division?: LocationNode;
  district?: LocationNode;
  upazila?: LocationNode;
  area?: LocationNode;
  remainingAddress: string;
}

export const locationService = {
  /**
   * Search for locations based on a query string (fuzzy matching)
   */
  searchLocations(query: string): LocationNode[] {
    if (!query || query.length < 2) return [];
    const results = fuse.search(query);
    return results.map(r => r.item).slice(0, 10);
  },

  /**
   * Get the full hierarchy for a given location ID
   */
  getLocationHierarchy(locationId: string) {
    const location = allLocations.find(l => l.id === locationId);
    if (!location) return null;

    let area: LocationNode | undefined;
    let upazila: LocationNode | undefined;
    let district: LocationNode | undefined;
    let division: LocationNode | undefined;

    if (location.type === 'area') {
      area = location;
      upazila = upazilas.find(u => u.id === location.upazilaId);
      district = districts.find(d => d.id === location.districtId);
      division = divisions.find(v => v.id === location.divisionId);
    } else if (location.type === 'upazila') {
      upazila = location;
      district = districts.find(d => d.id === location.districtId);
      division = divisions.find(v => v.id === location.divisionId);
    } else if (location.type === 'district') {
      district = location;
      division = divisions.find(v => v.id === location.divisionId);
    } else if (location.type === 'division') {
      division = location;
    }

    return { area, upazila, district, division };
  },

  /**
   * Smart address parsing to detect location entities from a raw string
   */
  parseAddress(address: string): ParsedAddress {
    if (!address) return { remainingAddress: '' };

    const cleanAddress = address.replace(/[^\w\s\u0980-\u09FF]/g, ' ');
    const tokens = cleanAddress.split(/[\s,.-]+/).filter(t => t.length > 2);
    
    // Generate unigrams, bigrams, and trigrams for better area detection
    const searchTerms: string[] = [];
    for(let i = 0; i < tokens.length; i++) {
        searchTerms.push(tokens[i]);
        if(i < tokens.length - 1) {
            searchTerms.push(tokens[i] + ' ' + tokens[i+1]);
        }
        if(i < tokens.length - 2) {
            searchTerms.push(tokens[i] + ' ' + tokens[i+1] + ' ' + tokens[i+2]);
        }
    }

    interface Match {
        term: string;
        item: LocationNode;
        score: number;
    }
    const matches: Match[] = [];
    
    searchTerms.forEach(term => {
        const termMatches = fuse.search(term);
        termMatches.forEach(m => {
            if(m.score !== undefined && m.score <= 0.35) {
                 matches.push({
                     term,
                     item: m.item,
                     score: m.score
                 });
            }
        });
    });

    matches.sort((a, b) => {
        if (Math.abs(a.score - b.score) < 0.01) {
            return b.term.length - a.term.length; // prefer longer search terms for similar scores
        }
        return a.score - b.score;
    });

    let detectedDivision: LocationNode | undefined;
    let detectedDistrict: LocationNode | undefined;
    let detectedUpazila: LocationNode | undefined;
    let detectedArea: LocationNode | undefined;

    // 1. First Pass: Detect District (জেলার নাম)
    for (const match of matches) {
      const item = match.item;
      if (item.type === 'district' && !detectedDistrict) {
        detectedDistrict = item;
        detectedDivision = divisions.find(d => d.id === item.divisionId);
        break; // Found the best matching district
      }
    }

    // 2. Second Pass: Detect Upazila/Thana (থানা)
    for (const match of matches) {
      const item = match.item;
      if (item.type === 'upazila' && !detectedUpazila) {
        // If we already detected a district, ensure this upazila belongs to it
        if (detectedDistrict && item.districtId !== detectedDistrict.id) continue;
        
        detectedUpazila = item;
        if (!detectedDistrict && item.districtId) {
          detectedDistrict = districts.find(d => d.id === item.districtId);
          detectedDivision = divisions.find(d => d.id === item.divisionId);
        }
        break; // Found the best matching upazila
      }
    }

    // 3. Third Pass: Detect Area (Metro Area / মেট্রো এরিয়া)
    for (const match of matches) {
      const item = match.item;
      if (item.type === 'area' && !detectedArea) {
        // If we have a district or upazila, ensure it matches
        if (detectedDistrict && item.districtId && item.districtId !== detectedDistrict.id) continue;
        if (detectedUpazila && item.upazilaId && item.upazilaId !== detectedUpazila.id) continue;
        
        detectedArea = item;
        // Optionally backfill upazila/district from area if they were not found
        // But since upazilas are an array of LocationNode, and might not be exported as easily,
        // we can just fill district and division
        if (!detectedDistrict && item.districtId) {
          detectedDistrict = districts.find(d => d.id === item.districtId);
          detectedDivision = divisions.find(d => d.id === item.divisionId);
        }
        break; // Found the best matching area
      }
    }

    // Still check for division if not found by the above
    if (!detectedDivision) {
      for (const match of matches) {
          const item = match.item;
          if (item.type === 'division' && !detectedDivision) {
             detectedDivision = item;
             break;
          }
      }
    }

    return {
      division: detectedDivision,
      district: detectedDistrict,
      upazila: detectedUpazila,
      area: detectedArea,
      remainingAddress: address
    };
  },

  /**
   * Map a location to a courier zone and calculate estimated delivery charge
   */
  getDeliveryCharge(district: string, division: string): number {
    const normalizedDistrict = district.toLowerCase();
    
    if (normalizedDistrict === 'dhaka') {
      return 80; // Inside Dhaka
    }
    
    const subAreas = ['gazipur', 'narayanganj', 'savar', 'keraniganj'];
    if (subAreas.includes(normalizedDistrict)) {
      return 130; // Sub Area
    }

    return 150; // Outside Dhaka
  },

  getDeliveryZone(district: string): string {
    const normalizedDistrict = district.toLowerCase();
    
    if (normalizedDistrict === 'dhaka') {
      return 'Inside Dhaka';
    }
    
    const subAreas = ['gazipur', 'narayanganj', 'savar', 'keraniganj'];
    if (subAreas.includes(normalizedDistrict)) {
      return 'Sub Area';
    }

    return 'Outside Dhaka';
  },

  /**
   * Helper function to match our standard names to courier API names fuzzyly
   */
  matchCourierLocation(targetName: string, items: any[], nameKey: string): any {
    if (!targetName || !items || items.length === 0) return null;
    
    // First try exact or subset match
    const normalizedTarget = targetName.toLowerCase();
    let exactMatch = items.find(i => i[nameKey].toLowerCase() === normalizedTarget);
    if (exactMatch) return exactMatch;

    // Then try fuzzy search
    const fuse = new Fuse(items, {
      keys: [nameKey],
      threshold: 0.4,
      includeScore: true,
      distance: 100,
    });
    
    const results = fuse.search(targetName);
    if (results.length > 0 && results[0].score !== undefined && results[0].score <= 0.45) {
      return results[0].item;
    }
    
    // Fallback naive search
    return items.find(i => 
      i[nameKey].toLowerCase().includes(normalizedTarget) || 
      normalizedTarget.includes(i[nameKey].toLowerCase())
    );
  }
};
