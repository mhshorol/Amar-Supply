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

    let upazila: LocationNode | undefined;
    let district: LocationNode | undefined;
    let division: LocationNode | undefined;

    if (location.type === 'upazila') {
      upazila = location;
      district = districts.find(d => d.id === location.districtId);
      division = divisions.find(v => v.id === location.divisionId);
    } else if (location.type === 'district') {
      district = location;
      division = divisions.find(v => v.id === location.divisionId);
    } else if (location.type === 'division') {
      division = location;
    }

    return { upazila, district, division };
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

    for (const match of matches) {
      const item = match.item;
      if (item.type === 'division') {
        if (!detectedDivision) {
             if (detectedDistrict && detectedDistrict.divisionId !== item.id) continue;
             if (detectedUpazila && detectedUpazila.divisionId !== item.id) continue;
             detectedDivision = item;
        }
      } else if (item.type === 'district') {
        if (!detectedDistrict) {
            if (detectedDivision && item.divisionId !== detectedDivision.id) continue;
            if (detectedUpazila && detectedUpazila.districtId !== item.id) continue;
            detectedDistrict = item;
            if (!detectedDivision) detectedDivision = divisions.find(d => d.id === item.divisionId);
        }
      } else if (item.type === 'upazila' || item.type === 'area') {
        if (!detectedUpazila) {
            if (detectedDistrict && item.districtId !== detectedDistrict.id) continue;
            if (detectedDivision && item.divisionId !== detectedDivision.id) continue;
            detectedUpazila = item;
            if (!detectedDistrict) detectedDistrict = districts.find(d => d.id === item.districtId);
            if (!detectedDivision) detectedDivision = divisions.find(d => d.id === item.divisionId);
        }
      }
    }

    return {
      division: detectedDivision,
      district: detectedDistrict,
      upazila: detectedUpazila,
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
