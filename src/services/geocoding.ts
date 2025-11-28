/**
 * Geocoding service
 * Uses ZIP code lookup for Northeast Ohio addresses
 */

import type { Coordinates } from '../types';

/**
 * NEO ZIP code coordinates
 * Comprehensive list of Northeast Ohio ZIP codes with lat/lng
 */
const NEO_ZIP_COORDS: Record<string, { city: string; lat: number; lng: number; county: string }> = {
  // Cuyahoga County - Cleveland area
  '44101': { city: 'Cleveland', lat: 41.4993, lng: -81.6944, county: 'Cuyahoga' },
  '44102': { city: 'Cleveland', lat: 41.4748, lng: -81.7379, county: 'Cuyahoga' },
  '44103': { city: 'Cleveland', lat: 41.5202, lng: -81.6417, county: 'Cuyahoga' },
  '44104': { city: 'Cleveland', lat: 41.4823, lng: -81.6208, county: 'Cuyahoga' },
  '44105': { city: 'Cleveland', lat: 41.4505, lng: -81.6312, county: 'Cuyahoga' },
  '44106': { city: 'Cleveland', lat: 41.5087, lng: -81.6069, county: 'Cuyahoga' },
  '44107': { city: 'Lakewood', lat: 41.4842, lng: -81.7982, county: 'Cuyahoga' },
  '44108': { city: 'Cleveland', lat: 41.5392, lng: -81.6172, county: 'Cuyahoga' },
  '44109': { city: 'Cleveland', lat: 41.4458, lng: -81.6964, county: 'Cuyahoga' },
  '44110': { city: 'Cleveland', lat: 41.5673, lng: -81.5705, county: 'Cuyahoga' },
  '44111': { city: 'Cleveland', lat: 41.4593, lng: -81.7874, county: 'Cuyahoga' },
  '44112': { city: 'Cleveland', lat: 41.5359, lng: -81.5759, county: 'Cuyahoga' },
  '44113': { city: 'Cleveland', lat: 41.4838, lng: -81.7001, county: 'Cuyahoga' },
  '44114': { city: 'Cleveland', lat: 41.5148, lng: -81.6713, county: 'Cuyahoga' },
  '44115': { city: 'Cleveland', lat: 41.4869, lng: -81.6632, county: 'Cuyahoga' },
  '44116': { city: 'Rocky River', lat: 41.4687, lng: -81.8528, county: 'Cuyahoga' },
  '44117': { city: 'Euclid', lat: 41.5734, lng: -81.5192, county: 'Cuyahoga' },
  '44118': { city: 'Cleveland Heights', lat: 41.5202, lng: -81.5567, county: 'Cuyahoga' },
  '44119': { city: 'Cleveland', lat: 41.5887, lng: -81.5405, county: 'Cuyahoga' },
  '44120': { city: 'Shaker Heights', lat: 41.4688, lng: -81.5756, county: 'Cuyahoga' },
  '44121': { city: 'South Euclid', lat: 41.5231, lng: -81.5186, county: 'Cuyahoga' },
  '44122': { city: 'Beachwood', lat: 41.4646, lng: -81.5087, county: 'Cuyahoga' },
  '44123': { city: 'Euclid', lat: 41.6012, lng: -81.5253, county: 'Cuyahoga' },
  '44124': { city: 'Lyndhurst', lat: 41.5187, lng: -81.4887, county: 'Cuyahoga' },
  '44125': { city: 'Garfield Heights', lat: 41.4165, lng: -81.6062, county: 'Cuyahoga' },
  '44126': { city: 'Fairview Park', lat: 41.4417, lng: -81.8642, county: 'Cuyahoga' },
  '44127': { city: 'Cleveland', lat: 41.4708, lng: -81.6483, county: 'Cuyahoga' },
  '44128': { city: 'Cleveland', lat: 41.4387, lng: -81.5367, county: 'Cuyahoga' },
  '44129': { city: 'Parma', lat: 41.3913, lng: -81.7371, county: 'Cuyahoga' },
  '44130': { city: 'Parma Heights', lat: 41.3923, lng: -81.7745, county: 'Cuyahoga' },
  '44131': { city: 'Independence', lat: 41.3873, lng: -81.6356, county: 'Cuyahoga' },
  '44132': { city: 'Euclid', lat: 41.6078, lng: -81.4862, county: 'Cuyahoga' },
  '44133': { city: 'North Royalton', lat: 41.3149, lng: -81.7245, county: 'Cuyahoga' },
  '44134': { city: 'Parma', lat: 41.3792, lng: -81.7096, county: 'Cuyahoga' },
  '44135': { city: 'Cleveland', lat: 41.4309, lng: -81.8198, county: 'Cuyahoga' },
  '44136': { city: 'Strongsville', lat: 41.3145, lng: -81.8362, county: 'Cuyahoga' },
  '44137': { city: 'Maple Heights', lat: 41.4095, lng: -81.5582, county: 'Cuyahoga' },
  '44138': { city: 'Olmsted Falls', lat: 41.3752, lng: -81.9084, county: 'Cuyahoga' },
  '44139': { city: 'Solon', lat: 41.3896, lng: -81.4411, county: 'Cuyahoga' },
  '44140': { city: 'Bay Village', lat: 41.4859, lng: -81.9223, county: 'Cuyahoga' },
  '44141': { city: 'Brecksville', lat: 41.3187, lng: -81.6267, county: 'Cuyahoga' },
  '44142': { city: 'Brookpark', lat: 41.3981, lng: -81.8145, county: 'Cuyahoga' },
  '44143': { city: 'Richmond Heights', lat: 41.5532, lng: -81.5009, county: 'Cuyahoga' },
  '44144': { city: 'Cleveland', lat: 41.4387, lng: -81.7453, county: 'Cuyahoga' },
  '44145': { city: 'Westlake', lat: 41.4528, lng: -81.9178, county: 'Cuyahoga' },
  '44146': { city: 'Bedford', lat: 41.3923, lng: -81.5365, county: 'Cuyahoga' },
  '44147': { city: 'Broadview Heights', lat: 41.3234, lng: -81.6817, county: 'Cuyahoga' },
  '44149': { city: 'Strongsville', lat: 41.2953, lng: -81.8362, county: 'Cuyahoga' },

  // Summit County - Akron area
  '44301': { city: 'Akron', lat: 41.0534, lng: -81.5190, county: 'Summit' },
  '44302': { city: 'Akron', lat: 41.0887, lng: -81.5234, county: 'Summit' },
  '44303': { city: 'Akron', lat: 41.1034, lng: -81.5467, county: 'Summit' },
  '44304': { city: 'Akron', lat: 41.0873, lng: -81.4856, county: 'Summit' },
  '44305': { city: 'Akron', lat: 41.0567, lng: -81.4623, county: 'Summit' },
  '44306': { city: 'Akron', lat: 41.0273, lng: -81.4823, county: 'Summit' },
  '44307': { city: 'Akron', lat: 41.0534, lng: -81.5456, county: 'Summit' },
  '44308': { city: 'Akron', lat: 41.0823, lng: -81.5134, county: 'Summit' },
  '44309': { city: 'Akron', lat: 41.0534, lng: -81.5190, county: 'Summit' },
  '44310': { city: 'Akron', lat: 41.0967, lng: -81.4967, county: 'Summit' },
  '44311': { city: 'Akron', lat: 41.0623, lng: -81.5267, county: 'Summit' },
  '44312': { city: 'Akron', lat: 41.0123, lng: -81.4312, county: 'Summit' },
  '44313': { city: 'Akron', lat: 41.1234, lng: -81.5567, county: 'Summit' },
  '44314': { city: 'Akron', lat: 41.0334, lng: -81.5567, county: 'Summit' },
  '44319': { city: 'Akron', lat: 40.9856, lng: -81.4623, county: 'Summit' },
  '44320': { city: 'Akron', lat: 41.0823, lng: -81.5767, county: 'Summit' },
  '44321': { city: 'Copley', lat: 41.1123, lng: -81.6267, county: 'Summit' },
  '44333': { city: 'Akron', lat: 41.1634, lng: -81.6267, county: 'Summit' },

  // Lake County
  '44060': { city: 'Mentor', lat: 41.6892, lng: -81.3395, county: 'Lake' },
  '44077': { city: 'Painesville', lat: 41.7245, lng: -81.2456, county: 'Lake' },
  '44092': { city: 'Wickliffe', lat: 41.6052, lng: -81.4534, county: 'Lake' },
  '44094': { city: 'Willoughby', lat: 41.6398, lng: -81.4062, county: 'Lake' },
  '44095': { city: 'Eastlake', lat: 41.6534, lng: -81.4534, county: 'Lake' },

  // Lorain County
  '44001': { city: 'Amherst', lat: 41.3978, lng: -82.2262, county: 'Lorain' },
  '44011': { city: 'Avon', lat: 41.4512, lng: -82.0265, county: 'Lorain' },
  '44012': { city: 'Avon Lake', lat: 41.5053, lng: -82.0284, county: 'Lorain' },
  '44035': { city: 'Elyria', lat: 41.3684, lng: -82.1076, county: 'Lorain' },
  '44052': { city: 'Lorain', lat: 41.4528, lng: -82.1823, county: 'Lorain' },
  '44053': { city: 'Lorain', lat: 41.4234, lng: -82.1534, county: 'Lorain' },
  '44054': { city: 'Sheffield Lake', lat: 41.4873, lng: -82.1012, county: 'Lorain' },
  '44055': { city: 'Lorain', lat: 41.4634, lng: -82.1423, county: 'Lorain' },
  '44039': { city: 'North Ridgeville', lat: 41.3892, lng: -82.0192, county: 'Lorain' },

  // Medina County
  '44256': { city: 'Medina', lat: 41.1384, lng: -81.8637, county: 'Medina' },
  '44281': { city: 'Wadsworth', lat: 41.0256, lng: -81.7298, county: 'Medina' },

  // Portage County
  '44240': { city: 'Kent', lat: 41.1537, lng: -81.3579, county: 'Portage' },
  '44266': { city: 'Ravenna', lat: 41.1576, lng: -81.2426, county: 'Portage' },
  '44272': { city: 'Rootstown', lat: 41.0876, lng: -81.2012, county: 'Portage' },

  // Stark County - Canton area
  '44701': { city: 'Canton', lat: 40.7989, lng: -81.3784, county: 'Stark' },
  '44702': { city: 'Canton', lat: 40.8234, lng: -81.3534, county: 'Stark' },
  '44703': { city: 'Canton', lat: 40.8123, lng: -81.3912, county: 'Stark' },
  '44704': { city: 'Canton', lat: 40.8012, lng: -81.3234, county: 'Stark' },
  '44705': { city: 'Canton', lat: 40.8423, lng: -81.3312, county: 'Stark' },
  '44706': { city: 'Canton', lat: 40.7634, lng: -81.4023, county: 'Stark' },
  '44707': { city: 'Canton', lat: 40.7789, lng: -81.3456, county: 'Stark' },
  '44708': { city: 'Canton', lat: 40.8234, lng: -81.4234, county: 'Stark' },
  '44709': { city: 'Canton', lat: 40.8534, lng: -81.3912, county: 'Stark' },
  '44710': { city: 'Canton', lat: 40.8012, lng: -81.4523, county: 'Stark' },
  '44711': { city: 'Canton', lat: 40.7989, lng: -81.3784, county: 'Stark' },
  '44714': { city: 'Canton', lat: 40.8323, lng: -81.3623, county: 'Stark' },
  '44718': { city: 'Canton', lat: 40.8623, lng: -81.4234, county: 'Stark' },
  '44720': { city: 'North Canton', lat: 40.8762, lng: -81.4023, county: 'Stark' },
  '44721': { city: 'Canton', lat: 40.8934, lng: -81.3312, county: 'Stark' },

  // Geauga County
  '44021': { city: 'Burton', lat: 41.4706, lng: -81.1454, county: 'Geauga' },
  '44022': { city: 'Chagrin Falls', lat: 41.4312, lng: -81.3912, county: 'Geauga' },
  '44023': { city: 'Chagrin Falls', lat: 41.3989, lng: -81.3234, county: 'Geauga' },
  '44024': { city: 'Chardon', lat: 41.5842, lng: -81.2078, county: 'Geauga' },
  '44040': { city: 'Gates Mills', lat: 41.5234, lng: -81.4023, county: 'Cuyahoga' },
  '44046': { city: 'Huntsburg', lat: 41.5312, lng: -81.0534, county: 'Geauga' },
  '44062': { city: 'Middlefield', lat: 41.4623, lng: -81.0734, county: 'Geauga' },

  // Ashtabula County
  '44004': { city: 'Ashtabula', lat: 41.8651, lng: -80.7898, county: 'Ashtabula' },
  '44010': { city: 'Austinburg', lat: 41.7834, lng: -80.8623, county: 'Ashtabula' },
  '44030': { city: 'Conneaut', lat: 41.9476, lng: -80.5545, county: 'Ashtabula' },
  '44041': { city: 'Geneva', lat: 41.8051, lng: -80.9481, county: 'Ashtabula' },
  '44047': { city: 'Jefferson', lat: 41.7387, lng: -80.7698, county: 'Ashtabula' },

  // Trumbull County
  '44410': { city: 'Cortland', lat: 41.3301, lng: -80.7254, county: 'Trumbull' },
  '44420': { city: 'Girard', lat: 41.1543, lng: -80.7012, county: 'Trumbull' },
  '44425': { city: 'Hubbard', lat: 41.1556, lng: -80.5698, county: 'Trumbull' },
  '44436': { city: 'Masury', lat: 41.2123, lng: -80.5312, county: 'Trumbull' },
  '44440': { city: 'Mineral Ridge', lat: 41.1389, lng: -80.7623, county: 'Trumbull' },
  '44446': { city: 'Niles', lat: 41.1820, lng: -80.7654, county: 'Trumbull' },
  '44470': { city: 'Southington', lat: 41.3034, lng: -80.9512, county: 'Trumbull' },
  '44481': { city: 'Warren', lat: 41.2378, lng: -80.8184, county: 'Trumbull' },
  '44482': { city: 'Warren', lat: 41.2534, lng: -80.7823, county: 'Trumbull' },
  '44483': { city: 'Warren', lat: 41.2712, lng: -80.8312, county: 'Trumbull' },
  '44484': { city: 'Warren', lat: 41.2123, lng: -80.8512, county: 'Trumbull' },
  '44485': { city: 'Warren', lat: 41.2378, lng: -80.8684, county: 'Trumbull' },

  // Mahoning County
  '44501': { city: 'Youngstown', lat: 41.0997, lng: -80.6495, county: 'Mahoning' },
  '44502': { city: 'Youngstown', lat: 41.0734, lng: -80.6623, county: 'Mahoning' },
  '44503': { city: 'Youngstown', lat: 41.1012, lng: -80.6512, county: 'Mahoning' },
  '44504': { city: 'Youngstown', lat: 41.1234, lng: -80.6312, county: 'Mahoning' },
  '44505': { city: 'Youngstown', lat: 41.1334, lng: -80.6123, county: 'Mahoning' },
  '44506': { city: 'Youngstown', lat: 41.0912, lng: -80.6234, county: 'Mahoning' },
  '44507': { city: 'Youngstown', lat: 41.0734, lng: -80.6823, county: 'Mahoning' },
  '44509': { city: 'Youngstown', lat: 41.1123, lng: -80.6923, county: 'Mahoning' },
  '44510': { city: 'Youngstown', lat: 41.1234, lng: -80.6712, county: 'Mahoning' },
  '44511': { city: 'Youngstown', lat: 41.0734, lng: -80.7123, county: 'Mahoning' },
  '44512': { city: 'Youngstown', lat: 41.0234, lng: -80.6823, county: 'Mahoning' },
  '44514': { city: 'Youngstown', lat: 41.0512, lng: -80.5923, county: 'Mahoning' },
  '44515': { city: 'Youngstown', lat: 41.1123, lng: -80.7423, county: 'Mahoning' },

  // Wayne County
  '44691': { city: 'Wooster', lat: 40.8051, lng: -81.9351, county: 'Wayne' },
  '44667': { city: 'Orrville', lat: 40.8437, lng: -81.7640, county: 'Wayne' },
};

/**
 * Validate if a ZIP code is in Northeast Ohio
 */
export function isNEOZipCode(zip: string): boolean {
  return zip in NEO_ZIP_COORDS;
}

/**
 * Get coordinates for a NEO ZIP code
 */
export function getZipCoordinates(zip: string): Coordinates | null {
  const data = NEO_ZIP_COORDS[zip];
  if (!data) return null;
  return { lat: data.lat, lng: data.lng };
}

/**
 * Get city name for a NEO ZIP code
 */
export function getZipCity(zip: string): string | null {
  const data = NEO_ZIP_COORDS[zip];
  return data?.city || null;
}

/**
 * Get county for a NEO ZIP code
 */
export function getZipCounty(zip: string): string | null {
  const data = NEO_ZIP_COORDS[zip];
  return data?.county || null;
}

/**
 * Get all ZIP code data
 */
export function getZipData(zip: string): { city: string; lat: number; lng: number; county: string } | null {
  return NEO_ZIP_COORDS[zip] || null;
}

/**
 * Geocode an address to coordinates
 * For MVP, we use ZIP code lookup. In production, integrate with Google Maps or similar.
 */
export async function geocodeAddress(address: string, city: string, zip: string): Promise<Coordinates | null> {
  // For MVP, use ZIP code centroid
  // In production, could use:
  // - Google Maps Geocoding API
  // - Mapbox Geocoding API
  // - OpenStreetMap Nominatim
  return getZipCoordinates(zip);
}

/**
 * Get list of all valid NEO ZIP codes
 */
export function getAllNEOZipCodes(): string[] {
  return Object.keys(NEO_ZIP_COORDS);
}

/**
 * Get ZIP codes by county
 */
export function getZipCodesByCounty(county: string): string[] {
  return Object.entries(NEO_ZIP_COORDS)
    .filter(([_, data]) => data.county.toLowerCase() === county.toLowerCase())
    .map(([zip]) => zip);
}
