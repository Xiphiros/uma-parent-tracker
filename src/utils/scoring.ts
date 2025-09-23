import { Goal, Parent, WhiteSpark, UniqueSpark, ManualParentData, Skill } from '../types';

// --- BASE SCORE TABLES & CONSTANTS (Quantified Utility Model) ---

const BASE_SCORES = {
    blue: { 1: 8, 2: 15, 3: 30 },
    pink: { 1: 10, 2: 17, 3: 30 },
};

const WHITE_SPARK_PROBABILITY = {
    starChance: { 1: 0.50, 2: 0.45, 3: 0.05 }, // Standard Rank Runs (< SS)
    ancestorBonus: 0.025,
};

const UTILITY_SCORES = {
    unique: { 1: 7, 2: 14, 3: 21 },
    white: { 1: 7, 2: 14, 3: 21 },
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
 * Calculates the base score of a white or unique spark dynamically.
 * @returns The calculated integer base score.
 */
const calculateDynamicSparkBaseScore = (
    spark: WhiteSpark | UniqueSpark,
    ancestorCount: number,
    skillMapByName: Map<string, Skill>
): number => {
    const { starChance, ancestorBonus } = WHITE_SPARK_PROBABILITY;
    const sourceSkill = skillMapByName.get(spark.name);

    let baseChance = 0.20; // Default for White and Unique skills
    if (sourceSkill) {
        // Source: Global Doc, p. 41. Rarity 2 is '◎', higher rarities are Gold.
        if (sourceSkill.rarity === 2) baseChance = 0.25;
        else if (sourceSkill.rarity && sourceSkill.rarity > 2) baseChance = 0.40;
    }
    
    const pAcquire = baseChance + (ancestorBonus * ancestorCount);
    const pStar = starChance[spark.stars];
    const finalProbability = pAcquire * pStar;

    if (finalProbability === 0) return 0;
    
    const rarityScore = Math.round(Math.sqrt(1 / finalProbability));
    const utilityScore = sourceSkill?.type === 'unique' ? UTILITY_SCORES.unique[spark.stars] : UTILITY_SCORES.white[spark.stars];
    
    return rarityScore + utilityScore;
};

// --- CORE SCORING FUNCTIONS ---

/**
 * Calculates the score for a single entity (Parent or ManualParentData).
 */
const calculateIndividualScore = (
    entity: Parent | ManualParentData,
    goal: Goal,
    inventoryMap: Map<number, Parent>,
    skillMapByName: Map<string, Skill>
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
        // Unique sparks now use dynamic base score calculation
        const baseScore = calculateDynamicSparkBaseScore(spark, 0, skillMapByName); // Uniques have no ancestors for generation chance
        totalScore += baseScore * getWishlistMultiplier(tier);
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
            const baseScore = calculateDynamicSparkBaseScore(spark, ancestorCount, skillMapByName);
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
            totalScore += baseScore * getWishlistMultiplier(tier);
        });
    }

    return totalScore;
};

/**
 * Calculates the final score for a parent, including bonuses from its grandparents.
 */
export const calculateScore = (
    parent: Parent,
    goal: Goal,
    inventory: Parent[],
    skillMapByName: Map<string, Skill>
): number => {
    const inventoryMap = new Map(inventory.map(p => [p.id, p]));

    const parentScore = calculateIndividualScore(parent, goal, inventoryMap, skillMapByName);

    const gp1 = typeof parent.grandparent1 === 'number' ? inventoryMap.get(parent.grandparent1) : parent.grandparent1;
    const gp2 = typeof parent.grandparent2 === 'number' ? inventoryMap.get(parent.grandparent2) : parent.grandparent2;

    const gp1Score = gp1 ? calculateIndividualScore(gp1, goal, inventoryMap, skillMapByName) : 0;
    const gp2Score = gp2 ? calculateIndividualScore(gp2, goal, inventoryMap, skillMapByName) : 0;

    const finalScore = parentScore + (gp1Score * GRANDPARENT_MULTIPLIER) + (gp2Score * GRANDPARENT_MULTIPLIER);

    return Math.round(finalScore);
};