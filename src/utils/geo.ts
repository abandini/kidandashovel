import type { Coordinates } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @returns Distance in miles
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a radius of another point
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMiles: number
): boolean {
  return calculateDistance(center, point) <= radiusMiles;
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'nearby';
  }
  if (miles < 1) {
    return `${Math.round(miles * 10) / 10} mi`;
  }
  return `${Math.round(miles * 10) / 10} mi`;
}

/**
 * Northeast Ohio bounding box (approximate)
 * Used for quick geographic validation before ZIP check
 */
export const NEO_BOUNDS = {
  north: 41.9,
  south: 40.8,
  east: -80.5,
  west: -82.3,
};

/**
 * Check if coordinates are roughly in Northeast Ohio
 */
export function isInNEOBounds(coords: Coordinates): boolean {
  return (
    coords.lat >= NEO_BOUNDS.south &&
    coords.lat <= NEO_BOUNDS.north &&
    coords.lng >= NEO_BOUNDS.west &&
    coords.lng <= NEO_BOUNDS.east
  );
}
