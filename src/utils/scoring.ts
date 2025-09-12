import { Goal, Parent, WhiteSpark, UniqueSpark, ManualParentData } from '../types';

const points = {
    blue: { primary: [0, 2, 6, 10], secondary: [0, 1, 4, 8], other: [0, 1, 2, 3] },
    pink: { primary: [0, 3, 6, 10], other: [0, 1, 2, 3] },
    unique: { 'S': [0, 5, 10, 15], 'A': [0, 3, 6, 10], 'B': [0, 2, 4, 6], 'C': [0, 1, 2, 3], 'OTHER': [0, 1, 2, 3] },
    white: { 'S': [0, 5, 10, 15], 'A': [0, 2, 5, 8], 'B': [0, 1, 3, 5], 'C': [0, 1, 2, 3], 'OTHER': [0, 1, 2, 3] }
};

type ScoreCategory = 'blue' | 'pink' | 'unique' | 'white';
type ScorableParent = Pick<Parent, 'blueSpark' | 'pinkSpark' | 'uniqueSparks' | 'whiteSparks'>;

function getScore(category: ScoreCategory, type: string, stars: 1 | 2 | 3, goal: Goal): number {
    if (category === 'blue') {
        const primaryBlueLower = goal.primaryBlue.map(s => s.toLowerCase());
        if (primaryBlueLower.includes(type.toLowerCase())) return points.blue.primary[stars];
        if (type.toLowerCase() === 'speed') return points.blue.secondary[stars];
        return points.blue.other[stars];
    }

    if (category === 'pink') {
        const primaryPinkLower = goal.primaryPink.map(s => s.toLowerCase());
        if (primaryPinkLower.includes(type.toLowerCase())) return points.pink.primary[stars];
        return points.pink.other[stars];
    }

    if (category === 'unique') {
        const wishlistItem = goal.uniqueWishlist.find(w => w.name === type);
        const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
        return points.unique[tier as keyof typeof points.unique]?.[stars] ?? 0;
    }
    
    if (category === 'white') {
        return points.white[type as keyof typeof points.white]?.[stars] ?? 0;
    }

    return 0;
}


/**
 * Calculates the score for a single entity (parent or grandparent) based on its sparks.
 * @param parent The parent data to score. Can be a full Parent or limited ManualParentData.
 * @param goal The user's defined goal.
 * @returns The base score for that entity.
 */
function calculateBaseScore(parent: ScorableParent | ManualParentData, goal: Goal): number {
    let totalScore = 0;

    totalScore += getScore('blue', parent.blueSpark.type, parent.blueSpark.stars, goal);
    totalScore += getScore('pink', parent.pinkSpark.type, parent.pinkSpark.stars, goal);
    parent.uniqueSparks.forEach((spark: UniqueSpark) => {
        totalScore += getScore('unique', spark.name, spark.stars, goal);
    });

    // Manually entered grandparents (ManualParentData) do not include white sparks.
    if ('whiteSparks' in parent) {
        parent.whiteSparks.forEach((spark: WhiteSpark) => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            if (wishlistItem) {
                totalScore += getScore('white', wishlistItem.tier, spark.stars, goal);
            } else {
                totalScore += getScore('white', 'OTHER', spark.stars, goal);
            }
        });
    }
    
    return totalScore;
}


/**
 * Calculates the final score for a parent, including bonuses from its grandparents.
 * @param parent The parent to score.
 * @param goal The user's defined goal.
 * @param inventory The full inventory list to look up owned grandparents by ID.
 * @returns The final, rounded score.
 */
export function calculateScore(parent: Parent, goal: Goal, inventory: Parent[]): number {
    let totalScore = calculateBaseScore(parent, goal);
    const GRANDPARENT_MULTIPLIER = 0.5;

    const inventoryMap = new Map(inventory.map(p => [p.id, p]));
    const grandparents = [parent.grandparent1, parent.grandparent2];

    for (const gp of grandparents) {
        if (!gp) continue;

        let gpData: ScorableParent | ManualParentData | undefined;
        if (typeof gp === 'number') {
            gpData = inventoryMap.get(gp);
        } else {
            gpData = gp;
        }

        if (gpData) {
            const grandparentBonus = calculateBaseScore(gpData, goal) * GRANDPARENT_MULTIPLIER;
            totalScore += grandparentBonus;
        }
    }

    return Math.round(totalScore);
}