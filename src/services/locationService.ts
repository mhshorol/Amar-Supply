import Fuse from 'fuse.js';
import { allLocations, LocationNode, divisions, districts, upazilas } from '../data/bangladesh-locations';

const fuseOptions = {
  keys: ['nameEn', 'nameBn'],
  threshold: 0.3,
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

    // Normalize and tokenize
    const tokens = address.split(/[,।\s]+/).filter(t => t.length > 1);
    
    let detectedUpazila: LocationNode | undefined;
    let detectedDistrict: LocationNode | undefined;
    let detectedDivision: LocationNode | undefined;

    // Try to match tokens from right to left (usually addresses end with larger entities)
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      const matches = fuse.search(token);
      
      if (matches.length > 0) {
        const bestMatch = matches[0].item;
        const score = matches[0].score || 1;

        // Only accept high confidence matches
        if (score < 0.2) {
          if (bestMatch.type === 'division' && !detectedDivision) {
            detectedDivision = bestMatch;
          } else if (bestMatch.type === 'district' && !detectedDistrict) {
            detectedDistrict = bestMatch;
            if (!detectedDivision) {
              detectedDivision = divisions.find(v => v.id === bestMatch.divisionId);
            }
          } else if (bestMatch.type === 'upazila' && !detectedUpazila) {
            detectedUpazila = bestMatch;
            if (!detectedDistrict) {
              detectedDistrict = districts.find(d => d.id === bestMatch.districtId);
            }
            if (!detectedDivision) {
              detectedDivision = divisions.find(v => v.id === bestMatch.divisionId);
            }
          }
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
    const normalizedDivision = division.toLowerCase();

    if (normalizedDistrict === 'dhaka') {
      return 80; // Inside Dhaka
    }
    
    const subAreas = ['gazipur', 'narayanganj', 'savar', 'keraniganj'];
    if (subAreas.includes(normalizedDistrict)) {
      return 120; // Sub Area
    }

    return 150; // Outside Dhaka
  }
};
