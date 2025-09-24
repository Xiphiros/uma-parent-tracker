import { BreedingPair, Goal, ManualParentData, Parent, Skill, WhiteSpark } from '../types';
import { resolveGrandparent } from './affinity';
import { calculateIndividualScore, scoreHypotheticalParent } from './scoring';

// -- CONSTANTS --
// These assumptions are critical and will be exposed to the user in a tooltip.
const ASSUMED_WHITE_SPARKS_PER_RUN = 5;
const ASSUMED_A_RANK_APTITUDES = 5;
const NUM_BLUE_STATS = 5;

const BLUE_SPARK_TYPES: ('Speed' | 'Stamina' | 'Power' | 'Guts' | 'Wit')[] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const STAR_PROBABILITY = {
  standard: { 1: 0.50, 2: 0.45, 3: 0.05 },
  ssPlus: { 1: 0.20, 2: 0.70, 3: 0.10 },
};

const WHITE_SKILL_BASE_PROBABILITY = {
  normal: 0.20,
  circle: 0.25,
  gold: 0.40,
};
const ANCESTOR_BONUS = 1.1;

type ProbabilityDistribution = Map<number, number>; // Map<Score, Probability>

// -- PROBABILITY MODELING --

/**
 * Models the probability distribution for the Blue Spark's score contribution.
 */
function getBlueSparkDistribution(goal: Goal, targetStats: Record<string, number>): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    const starProbabilities = {
        1: 1 - (getBlueStarProbability(targetStats.speed || 0) + getBlueStarProbability(targetStats.stamina || 0) + getBlueStarProbability(targetStats.power || 0) + getBlueStarProbability(targetStats.guts || 0) + getBlueStarProbability(targetStats.wit || 0)),
        2: 0, // Simplified: Assume non-3 stars are 1-star for this model
        3: 0,
    };
    
    // Calculate P(3-star) for each stat
    for (const stat of BLUE_SPARK_TYPES) {
        starProbabilities[3] += (1 / NUM_BLUE_STATS) * getBlueStarProbability(targetStats[stat.toLowerCase()] || 0);
    }
    starProbabilities[1] = 1 - starProbabilities[3];


    for (const stat of BLUE_SPARK_TYPES) {
        for (const stars of [1, 3] as const) {
            const prob = (1 / NUM_BLUE_STATS) * starProbabilities[stars];
            if (prob === 0) continue;

            const score = Math.round(scoreHypotheticalParent(
                { blueSpark: { type: stat, stars }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] },
                goal, [], new Map()
            ));
            
            const blueScoreContribution = score - Math.round(scoreHypotheticalParent(
                { blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] },
                goal, [], new Map()
            ));

            distribution.set(blueScoreContribution, (distribution.get(blueScoreContribution) || 0) + prob);
        }
    }
    return distribution;
}

/**
 * Models the probability distribution for the Pink Spark's score contribution.
 */
function getPinkSparkDistribution(goal: Goal, trainingRank: 'ss' | 'ss+'): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    const starProbs = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;

    // Simplified: Assume all non-primary aptitudes have a collective probability.
    const primaryProb = goal.primaryPink.length / ASSUMED_A_RANK_APTITUDES;
    const otherProb = 1 - primaryProb;
    
    for (const stars of [1, 2, 3] as const) {
        // Primary
        if (primaryProb > 0) {
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: goal.primaryPink[0], stars }, whiteSparks: [] }, goal, [], new Map()));
            const pinkScore = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map()));
            distribution.set(pinkScore, (distribution.get(pinkScore) || 0) + (primaryProb * starProbs[stars]));
        }
        // Other
        if (otherProb > 0) {
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: 'Other', stars }, whiteSparks: [] }, goal, [], new Map()));
            const pinkScore = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map()));
            distribution.set(pinkScore, (distribution.get(pinkScore) || 0) + (otherProb * starProbs[stars]));
        }
    }
    return distribution;
}

/**
 * Models the probability distribution for a single White Spark's score contribution.
 */
function getWhiteSparkDistribution(
    pair: BreedingPair,
    goal: Goal,
    trainingRank: 'ss' | 'ss+',
    skillMapByName: Map<string, Skill>,
    inventoryMap: Map<number, Parent>
): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    const starProbs = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;
    const lineage = [pair.p1, pair.p2, ...[pair.p1, pair.p2].flatMap(p => [resolveGrandparent(p.grandparent1, inventoryMap), resolveGrandparent(p.grandparent2, inventoryMap)])];

    // Create a simplified distribution of all potential white sparks in the game
    const potentialSkills = Array.from(skillMapByName.values()).filter(s => s.type === 'normal');

    potentialSkills.forEach(skill => {
        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        if (skill.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;
        if (skill.rarity && skill.rarity > 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.gold;

        const ancestorCount = lineage.filter(member => member && member.whiteSparks.some(s => s.name === skill.name_en)).length;
        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        
        for (const stars of [1, 2, 3] as const) {
            const prob = acquireProb * starProbs[stars] / potentialSkills.length; // Normalize by total skills
            if (prob === 0) continue;
            
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [{ name: skill.name_en, stars }] }, goal, [], skillMapByName));
            const whiteScore = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map()));
            
            distribution.set(whiteScore, (distribution.get(whiteScore) || 0) + prob);
        }
    });

    const totalProb = Array.from(distribution.values()).reduce((a, b) => a + b, 0);
    distribution.set(0, (distribution.get(0) || 0) + (1 - totalProb)); // Chance of getting no score from this spark slot

    return distribution;
}

const getBlueStarProbability = (statValue: number): number => {
    if (statValue >= 1100) return 0.10;
    if (statValue >= 600) return 0.06;
    return 0;
};


// -- DYNAMIC PROGRAMMING --

/**
 * Convolves two probability distributions using Dynamic Programming.
 */
function convolve(dist1: ProbabilityDistribution, dist2: ProbabilityDistribution): ProbabilityDistribution {
    const newDist: ProbabilityDistribution = new Map();
    for (const [score1, prob1] of dist1.entries()) {
        for (const [score2, prob2] of dist2.entries()) {
            const newScore = score1 + score2;
            const newProb = prob1 * prob2;
            newDist.set(newScore, (newDist.get(newScore) || 0) + newProb);
        }
    }
    return newDist;
}


// -- PUBLIC API --

/**
 * Calculates the probability of a new parent's individual score being higher than the weaker parent in a pair.
 */
export const calculateUpgradeProbability = (
    pair: BreedingPair,
    goal: Goal,
    targetStats: Record<string, number>,
    trainingRank: 'ss' | 'ss+',
    inventoryMap: Map<number, Parent>,
    skillMapByName: Map<string, Skill>
): number => {
    try {
        const p1Score = calculateIndividualScore(pair.p1, goal, inventoryMap, skillMapByName);
        const p2Score = calculateIndividualScore(pair.p2, goal, inventoryMap, skillMapByName);
        const targetIndividualScore = Math.min(p1Score, p2Score);

        // 1. Get individual spark distributions
        const blueDist = getBlueSparkDistribution(goal, targetStats);
        const pinkDist = getPinkSparkDistribution(goal, trainingRank);
        const whiteDist = getWhiteSparkDistribution(pair, goal, trainingRank, skillMapByName, inventoryMap);

        // 2. Convolve distributions
        let finalDist = convolve(blueDist, pinkDist);
        for (let i = 0; i < ASSUMED_WHITE_SPARKS_PER_RUN; i++) {
            finalDist = convolve(finalDist, whiteDist);
        }
        
        // 3. Sum probabilities for scores exceeding the target
        let upgradeProb = 0;
        for (const [score, prob] of finalDist.entries()) {
            if (score > targetIndividualScore) {
                upgradeProb += prob;
            }
        }
        return upgradeProb;
    } catch (error) {
        console.error("Error calculating upgrade probability:", error);
        return 0; // Return 0 on any calculation error
    }
};