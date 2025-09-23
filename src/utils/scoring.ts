import { Goal, Parent, WhiteSpark, UniqueSpark, ManualParentData } from '../types';

// --- BASE SCORE TABLES & CONSTANTS ---

const BASE_SCORES = {
    blue: { 1: 12, 2: 13, 3: 100 },
    pink: { 1: 6, 2: 7, 3: 50 },
};

const WHITE_SPARK_PROBABILITY = {
    baseChance: 0.20,
    starChance: { 1: 0.50, 2: 0.45, 3: 0.05 }, // Standard Rank Runs (< SS)
    inheritanceBonus: 1.1,
    categoryWeight: 0.8,
};

const GRANDPARENT_MULTIPLIER = 0.5;

// --- MULTIPLIER LOGIC ---

const getBlueMultiplier = (type: string, goal: Goal): number => {
    if (goal.primaryBlue.includes(type)) return 1.5;
    if (goal.secondaryBlue.includes(type)) return 1.2;
    return 0.5;
};

const getPinkMultiplier = (type: string, goal: Goal): number => {
    return goal.primaryPink.includes(type) ? 1.5 : 0.5;
};

const getWishlistMultiplier = (tier: 'S' | 'A' | 'B' | 'C' | 'OTHER'): number => {
    switch (tier) {
        case 'S': return 2.0;
        case 'A': return 1.5;
        case 'B': return 1.2;
        case 'C': return 1.0;
        default: return 1.0; // "Other" white sparks get their full base value
    }
};

// --- WHITE SPARK DYNAMIC SCORING ---

/**
 * Calculates the base score of a white spark dynamically based on its inheritance chain.
 * @param stars The star rating of the spark.
 * @param ancestorCount The number of direct ancestors (grandparents) with the same spark.
 * @returns The calculated integer base score.
 */
const calculateWhiteSparkBaseScore = (stars: 1 | 2 | 3, ancestorCount: number): number => {
    const { baseChance, starChance, inheritanceBonus, categoryWeight } = WHITE_SPARK_PROBABILITY;
    const pAcquire = baseChance * (inheritanceBonus ** ancestorCount);
    const pStar = starChance[stars];
    const finalProbability = pAcquire * pStar;

    if (finalProbability === 0) return 0;

    const rawScore = (1 / finalProbability) * categoryWeight;
    return Math.round(rawScore);
};

// --- CORE SCORING FUNCTIONS ---

/**
 * Calculates the score for a single entity (Parent or ManualParentData),
 * considering its own sparks and lineage for white spark calculations.
 */
const calculateIndividualScore = (
    entity: Parent | ManualParentData,
    goal: Goal,
    inventoryMap: Map<number, Parent>
): number => {
    let totalScore = 0;

    // Blue Spark Score
    const blueBase = BASE_SCORES.blue[entity.blueSpark.stars];
    totalScore += blueBase * getBlueMultiplier(entity.blueSpark.type, goal);

    // Pink Spark Score
    const pinkBase = BASE_SCORES.pink[entity.pinkSpark.stars];
    totalScore += pinkBase * getPinkMultiplier(entity.pinkSpark.type, goal);

    // Unique Spark Score
    entity.uniqueSparks.forEach((spark: UniqueSpark) => {
        const wishlistItem = goal.uniqueWishlist.find(w => w.name === spark.name);
        const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
        // Unique sparks don't have a base score table; we use a simplified point system.
        const uniquePoints = { S: [0, 5, 10, 15], A: [0, 3, 6, 10], B: [0, 2, 4, 6], C: [0, 1, 2, 3], OTHER: [0, 0, 1, 2] };
        totalScore += uniquePoints[tier][spark.stars] || 0;
    });

    // White Spark Score (Dynamic)
    if ('whiteSparks' in entity) {
        let ancestorCountMap = new Map<string, number>();

        if ('grandparent1' in entity && 'grandparent2' in entity) {
            const grandparents = [
                entity.grandparent1,
                entity.grandparent2
            ].map(gp => (typeof gp === 'number' ? inventoryMap.get(gp) : gp));

            for (const gp of grandparents) {
                if (gp && 'whiteSparks' in gp) {
                    gp.whiteSparks.forEach(spark => {
                        ancestorCountMap.set(spark.name, (ancestorCountMap.get(spark.name) || 0) + 1);
                    });
                }
            }
        }

        entity.whiteSparks.forEach((spark: WhiteSpark) => {
            const ancestorCount = ancestorCountMap.get(spark.name) || 0;
            const baseScore = calculateWhiteSparkBaseScore(spark.stars, ancestorCount);
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
            totalScore += baseScore * getWishlistMultiplier(tier);
        });
    }

    return totalScore;
};

/**
 * Calculates the final score for a parent, including bonuses from its grandparents.
 * @param parent The parent to score.
 * @param goal The user's defined goal.
 * @param inventory The full inventory list to look up owned grandparents by ID.
 * @returns The final, rounded score.
 */
export const calculateScore = (parent: Parent, goal: Goal, inventory: Parent[]): number => {
    const inventoryMap = new Map(inventory.map(p => [p.id, p]));

    const parentScore = calculateIndividualScore(parent, goal, inventoryMap);

    const gp1 = typeof parent.grandparent1 === 'number' ? inventoryMap.get(parent.grandparent1) : parent.grandparent1;
    const gp2 = typeof parent.grandparent2 === 'number' ? inventoryMap.get(parent.grandparent2) : parent.grandparent2;

    const gp1Score = gp1 ? calculateIndividualScore(gp1, goal, inventoryMap) : 0;
    const gp2Score = gp2 ? calculateIndividualScore(gp2, goal, inventoryMap) : 0;

    const finalScore = parentScore + (gp1Score * GRANDPARENT_MULTIPLIER) + (gp2Score * GRANDPARENT_MULTIPLIER);

    return Math.round(finalScore);
};