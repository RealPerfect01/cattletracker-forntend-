/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks if a point is inside a polygon using the Ray Casting algorithm.
 * @param point [latitude, longitude]
 * @param polygon Array of [latitude, longitude] points
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;

  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Determines which zone a point belongs to.
 * Priority is given to the smallest/most specific zone.
 */
export function getDeviceZone(
  point: [number, number], 
  geofences: { 
    grazing: [number, number][], 
    neighbor: [number, number][],
    outside: [number, number][] 
  }
): { id: string; name: string } {
  // Check Grazing Zone first (highest priority)
  if (isPointInPolygon(point, geofences.grazing)) {
    return { id: 'grazing', name: 'Grazing Zone' };
  }
  
  // Check Neighbor Zone next
  if (isPointInPolygon(point, geofences.neighbor)) {
    return { id: 'neighbor', name: 'Neighbor Grazing Zone' };
  }

  // Check Outside Zone
  if (isPointInPolygon(point, geofences.outside)) {
    return { id: 'outside', name: 'Outside Zone' };
  }

  return { id: 'none', name: 'Unknown Area' };
}
