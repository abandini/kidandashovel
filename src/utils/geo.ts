// Geolocation utilities for A Kid and a Shovel

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a ZIP code is in Northeast Ohio
 * @param zip ZIP code to check
 * @param neoPrefixes Comma-separated list of NEO ZIP prefixes
 * @returns boolean
 */
export function isNEOZipCode(zip: string, neoPrefixes: string): boolean {
  if (!zip || zip.length < 3) return false;

  const prefixes = neoPrefixes.split(',').map(p => p.trim());
  const zipPrefix = zip.substring(0, 3);

  return prefixes.includes(zipPrefix);
}

/**
 * Get approximate coordinates for a ZIP code
 * This is a fallback when we can't geocode
 */
export function getZipCodeCenter(zip: string): { lat: number; lng: number } | null {
  // Cleveland area approximate center
  const clevelandArea: Record<string, { lat: number; lng: number }> = {
    '440': { lat: 41.4993, lng: -81.6944 },
    '441': { lat: 41.4500, lng: -81.7000 },
    '442': { lat: 41.0814, lng: -81.5190 },
    '443': { lat: 41.1000, lng: -80.6500 },
    '444': { lat: 41.0997, lng: -80.6495 },
  };

  if (!zip || zip.length < 3) return null;

  const prefix = zip.substring(0, 3);
  return clevelandArea[prefix] || null;
}

/**
 * Calculate bounding box for a radius search
 * Returns min/max lat/lng for efficient database queries
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMiles: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  // Approximate degrees per mile at this latitude
  const latDegPerMile = 1 / 69.0;
  const lngDegPerMile = 1 / (69.0 * Math.cos(toRadians(lat)));

  const latDelta = radiusMiles * latDegPerMile;
  const lngDelta = radiusMiles * lngDegPerMile;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'nearby';
  } else if (miles < 1) {
    return `${Math.round(miles * 10) / 10} mi`;
  } else {
    return `${Math.round(miles * 10) / 10} mi`;
  }
}

/**
 * Sort items by distance from a point
 */
export function sortByDistance<T extends { lat?: number; lng?: number }>(
  items: T[],
  fromLat: number,
  fromLng: number
): (T & { distance_miles: number })[] {
  return items
    .map(item => ({
      ...item,
      distance_miles: item.lat && item.lng
        ? calculateDistance(fromLat, fromLng, item.lat, item.lng)
        : Infinity,
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles);
}
