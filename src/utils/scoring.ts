import { Goal, Parent, WhiteSpark, UniqueSpark, ManualParentData, Skill } from '../types';

// -- BASE SCORE TABLES & CONSTANTS --

const BASE_SCORES = {
    blue: { 1: 8, 2: 15, 3: 30 },
    pink: { 1: 10, 2: 17, 3: 30 },
};

// Use the standardized probabilities from the methodology documentation
const STAR_PROBABILITY = { 1: 0.50, 2: 0.45, 3: 0.06 };

const WHITE_SPARK_PROBABILITY = {
    ancestorBonus: 0.025,
};

const UTILITY_SCORES = {
    unique: { 1: 7, 2: 14, 3: 21 },
    white: { 1: 7, 2: 14, 3: 21 },
};

const GRANDPARENT_MULTIPLIER = 0.5;

// -- MULTIPLIER LOGIC --

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
        default: return 1.0;
    }
};

// -- DYNAMIC SCORING --

/**
 * Calculates the base score of a white or unique spark dynamically.
 */
const calculateDynamicSparkBaseScore = (
    spark: WhiteSpark | UniqueSpark,
    ancestorCount: number,
    skillMapByName: Map<string, Skill>
): number => {
    const { ancestorBonus } = WHITE_SPARK_PROBABILITY;
    const factor = skillMapByName.get(spark.name);

    // If factor is not found (e.g., it's a race/scenario factor), calculate a default score.
    if (!factor) {
        const pAcquire = 0.20 + (ancestorBonus * ancestorCount); // Simplified base probability
        const pStar = STAR_PROBABILITY[spark.stars];
        const finalProbability = pAcquire * pStar;
        if (finalProbability === 0) return 0;
        
        const rarityScore = Math.round(Math.sqrt(1 / finalProbability));
        // Assume it's a generic white spark for utility.
        const utilityScore = UTILITY_SCORES.white[spark.stars];
        return rarityScore + utilityScore;
    }

    let baseChance = 0.20; // Default for normal white skills
    let utilityScore = UTILITY_SCORES.white[spark.stars];
    
    // If it's a unique factor, its acquisition probability is higher.
    if (factor.category === 'unique') {
        baseChance = 0.40;
        utilityScore = UTILITY_SCORES.unique[spark.stars];
    }
    
    const pAcquire = baseChance + (ancestorBonus * ancestorCount);
    const pStar = STAR_PROBABILITY[spark.stars];
    const finalProbability = pAcquire * pStar;

    if (finalProbability === 0) return 0;
    
    const rarityScore = Math.round(Math.sqrt(1 / finalProbability));
    
    return rarityScore + utilityScore;
};

// -- SCORING LOGIC --

/**
 * Calculates the score for a single entity (Parent or ManualParentData).
 */
export const calculateIndividualScore = (
    entity: Parent | ManualParentData,
    goal: Goal,
    inventoryMap: Map<number, Parent>,
    skillMapByName: Map<string, Skill>
): number => {
    let baseTotalScore = 0;

    // --- Base Spark Scoring ---
    const blueBase = BASE_SCORES.blue[entity.blueSpark.stars];
    baseTotalScore += blueBase * getBlueMultiplier(entity.blueSpark.type, goal);
    const pinkBase = BASE_SCORES.pink[entity.pinkSpark.stars];
    baseTotalScore += pinkBase * getPinkMultiplier(entity.pinkSpark.type, goal);

    // Dynamic White Spark Scoring
    if ('whiteSparks' in entity) {
        const ancestorWhiteSparks: WhiteSpark[] = [];
        if ('grandparent1' in entity && 'grandparent2' in entity) {
            const grandparents = [entity.grandparent1, entity.grandparent2]
                .map(gp => (typeof gp === 'number' ? inventoryMap.get(gp) : gp));
            grandparents.forEach(gp => {
                if (gp && 'whiteSparks' in gp) ancestorWhiteSparks.push(...gp.whiteSparks);
            });
        }
        const ancestorCountMap = new Map<string, number>();
        ancestorWhiteSparks.forEach(spark => {
            ancestorCountMap.set(spark.name, (ancestorCountMap.get(spark.name) || 0) + 1);
        });

        entity.whiteSparks.forEach((spark: WhiteSpark) => {
            const ancestorCount = ancestorCountMap.get(spark.name) || 0;
            const baseScore = calculateDynamicSparkBaseScore(spark, ancestorCount, skillMapByName);
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
            baseTotalScore += baseScore * getWishlistMultiplier(tier);
        });
    }

    // Unique Spark Scoring
    entity.uniqueSparks.forEach((spark: UniqueSpark) => {
        const wishlistItem = goal.uniqueWishlist.find(w => w.name === spark.name);
        const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
        const baseScore = calculateDynamicSparkBaseScore(spark, 0, skillMapByName);
        baseTotalScore += baseScore * getWishlistMultiplier(tier);
    });

    // --- White Spark Count Bonus ---
    let whiteSparkCount = 0;
    if ('whiteSparks' in entity) {
        whiteSparkCount = entity.whiteSparks.length;
    }
    const countMultiplier = 1 + (whiteSparkCount * 0.01);

    return baseTotalScore * countMultiplier;
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