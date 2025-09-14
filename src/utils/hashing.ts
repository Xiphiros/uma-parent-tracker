import { Parent, NewParentData, Grandparent, ManualParentData } from '../types';

// Helper to sort sparks for consistent hashing
const sortSparks = (sparks: { name: string; stars: number }[]) => {
  if (!sparks) return [];
  return [...sparks].sort((a, b) => a.name.localeCompare(b.name));
};

// Helper to get a stable string representation of a grandparent
const serializeGrandparent = (gp?: Grandparent): string => {
    if (!gp) return 'none';
    if (typeof gp === 'number') return `id:${gp}`;
    
    // For ManualParentData, create a stable string from its properties
    const manualGp = gp as ManualParentData;
    const uniqueSparks = sortSparks(manualGp.uniqueSparks).map(s => `${s.name}|${s.stars}`).join(',');
    const whiteSparks = sortSparks(manualGp.whiteSparks).map(s => `${s.name}|${s.stars}`).join(',');
    
    return `manual:${manualGp.umaId || 'none'}:${manualGp.blueSpark.type}|${manualGp.blueSpark.stars}:${manualGp.pinkSpark.type}|${manualGp.pinkSpark.stars}:${uniqueSparks}:${whiteSparks}`;
};

/**
 * Generates a consistent hash for a parent based on its defining characteristics.
 * The score, gen, name, and id are excluded as they don't define the parent's "genetic" makeup.
 */
export const generateParentHash = (parentData: NewParentData | Parent): string => {
  const { umaId, blueSpark, pinkSpark, uniqueSparks, whiteSparks, grandparent1, grandparent2 } = parentData;

  const uniqueString = sortSparks(uniqueSparks).map(s => `${s.name}|${s.stars}`).join(',');
  const whiteString = sortSparks(whiteSparks).map(s => `${s.name}|${s.stars}`).join(',');

  const components = [
    `uma:${umaId}`,
    `blue:${blueSpark.type}|${blueSpark.stars}`,
    `pink:${pinkSpark.type}|${pinkSpark.stars}`,
    `unique:${uniqueString}`,
    `white:${whiteString}`,
    `gp1:${serializeGrandparent(grandparent1)}`,
    `gp2:${serializeGrandparent(grandparent2)}`,
  ];

  return components.join(';');
};