import { Goal, Parent, WhiteSpark, UniqueSpark, ManualParentData, Skill } from '../types';

// -- BASE SCORE TABLES & CONSTANTS --

const BASE_SCORES = {
    blue: { 1: 8, 2: 15, 3: 30 },
    pink: { 1: 10, 2: 17, 3: 30 },
};

const STAR_PROBABILITY = {
  standard: { 1: 0.50, 2: 0.45, 3: 0.05 }, // For ranks below SS+
  ssPlus: { 1: 0.20, 2: 0.70, 3: 0.10 },   // For ranks SS+ and higher
};

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
    skillMapByName: Map<string, Skill>,
    trainingRank: 'ss' | 'ss+'
): number => {
    const { ancestorBonus } = WHITE_SPARK_PROBABILITY;
    const starChance = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;
    const sourceSkill = skillMapByName.get(spark.name);

    let baseChance = 0.20;
    if (sourceSkill) {
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

// -- SCORING LOGIC --

interface HypotheticalParentSparks {
    blueSpark: { type: string, stars: 1 | 2 | 3 };
    pinkSpark: { type: string, stars: 1 | 2 | 3 };
    whiteSparks: WhiteSpark[];
}

/**
 * Scores a hypothetical set of sparks against a goal, with a given ancestor context.
 */
export const scoreHypotheticalParent = (
    sparks: HypotheticalParentSparks,
    goal: Goal,
    ancestorWhiteSparks: WhiteSpark[],
    skillMapByName: Map<string, Skill>,
    trainingRank: 'ss' | 'ss+' = 'ss'
): number => {
    let totalScore = 0;

    const blueBase = BASE_SCORES.blue[sparks.blueSpark.stars];
    totalScore += blueBase * getBlueMultiplier(sparks.blueSpark.type, goal);

    const pinkBase = BASE_SCORES.pink[sparks.pinkSpark.stars];
    totalScore += pinkBase * getPinkMultiplier(sparks.pinkSpark.type, goal);
    
    const ancestorCountMap = new Map<string, number>();
    ancestorWhiteSparks.forEach(spark => {
        ancestorCountMap.set(spark.name, (ancestorCountMap.get(spark.name) || 0) + 1);
    });

    sparks.whiteSparks.forEach((spark: WhiteSpark) => {
        const ancestorCount = ancestorCountMap.get(spark.name) || 0;
        const baseScore = calculateDynamicSparkBaseScore(spark, ancestorCount, skillMapByName, trainingRank);
        const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
        const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
        totalScore += baseScore * getWishlistMultiplier(tier);
    });
    
    // --- White Spark Count Bonus (for hypothetical parents) ---
    const whiteSparkCount = sparks.whiteSparks.length;
    const countMultiplier = 1 + (whiteSparkCount * 0.01);

    return totalScore * countMultiplier;
};

/**
 * Calculates the score for a single entity (Parent or ManualParentData).
 */
export const calculateIndividualScore = (
    entity: Parent | ManualParentData,
    goal: Goal,
    inventoryMap: Map<number, Parent>,
    skillMapByName: Map<string, Skill>,
    trainingRank: 'ss' | 'ss+' = 'ss'
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
            const baseScore = calculateDynamicSparkBaseScore(spark, ancestorCount, skillMapByName, trainingRank);
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
            baseTotalScore += baseScore * getWishlistMultiplier(tier);
        });
    }

    // Unique Spark Scoring
    entity.uniqueSparks.forEach((spark: UniqueSpark) => {
        const wishlistItem = goal.uniqueWishlist.find(w => w.name === spark.name);
        const tier = wishlistItem ? wishlistItem.tier : 'OTHER';
        const baseScore = calculateDynamicSparkBaseScore(spark, 0, skillMapByName, trainingRank);
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
    skillMapByName: Map<string, Skill>,
    trainingRank: 'ss' | 'ss+' = 'ss'
): number => {
    const inventoryMap = new Map(inventory.map(p => [p.id, p]));

    const parentScore = calculateIndividualScore(parent, goal, inventoryMap, skillMapByName, trainingRank);

    const gp1 = typeof parent.grandparent1 === 'number' ? inventoryMap.get(parent.grandparent1) : parent.grandparent1;
    const gp2 = typeof parent.grandparent2 === 'number' ? inventoryMap.get(parent.grandparent2) : parent.grandparent2;

    const gp1Score = gp1 ? calculateIndividualScore(gp1, goal, inventoryMap, skillMapByName, trainingRank) : 0;
    const gp2Score = gp2 ? calculateIndividualScore(gp2, goal, inventoryMap, skillMapByName, trainingRank) : 0;

    const finalScore = parentScore + (gp1Score * GRANDPARENT_MULTIPLIER) + (gp2Score * GRANDPARENT_MULTIPLIER);

    return Math.round(finalScore);
};