import { BreedingPair, Goal, ManualParentData, Parent, Skill } from '../types';
import { resolveGrandparent } from '../utils/affinity';
import { calculateIndividualScore, scoreHypotheticalParent } from '../utils/scoring';
import { calculateSparkCountDistribution } from '../utils/sparkAcquisitionModel';

// The main entry point for the worker. It listens for messages from the main thread.
self.onmessage = (e: MessageEvent<any>) => {
    const { 
        pair, goal, targetStats, trainingRank, 
        inventory, skillMapEntries, spBudget,
        acquirableSkillIds, targetAptitudes
    } = e.data;

    // Reconstruct Maps from the serialized arrays sent from the main thread.
    const inventoryMap = new Map<number, Parent>(inventory.map((p: Parent) => [p.id, p]));
    const skillMapByName = new Map<string, Skill>(skillMapEntries);
    const acquirableSkillIdsSet = new Set<string>(acquirableSkillIds);

    try {
        const result = calculateUpgradeProbability(
            pair, goal, targetStats, trainingRank, 
            inventoryMap, skillMapByName, spBudget,
            acquirableSkillIdsSet, targetAptitudes
        );
        // Send the result back to the main thread on success.
        self.postMessage({ result });
    } catch (error) {
        // Send an error message back if the calculation fails.
        self.postMessage({ error: error instanceof Error ? error.message : 'Unknown worker error' });
    }
};


// --- All calculation logic from upgradeProbability.ts is now here ---

const NUM_BLUE_STATS = 5;
const BLUE_SPARK_TYPES: ('Speed' | 'Stamina' | 'Power' | 'Guts' | 'Wit')[] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];

const STAR_PROBABILITY = {
  standard: { 1: 0.50, 2: 0.45, 3: 0.05 },
  ssPlus: { 1: 0.20, 2: 0.70, 3: 0.10 },
};

const BLUE_STAR_PROBABILITY = {
    high: { 1: 0.40, 2: 0.50, 3: 0.10 },
    mid: { 1: 0.44, 2: 0.50, 3: 0.06 },
    low: { 1: 0.50, 2: 0.50, 3: 0.00 },
};

const WHITE_SKILL_BASE_PROBABILITY = {
  normal: 0.20, circle: 0.25, gold: 0.40,
};
const ANCESTOR_BONUS = 1.1;

type ProbabilityDistribution = Map<number, number>;

const getBlueStarDistributionForStat = (statValue: number): { 1: number; 2: number; 3: number } => {
    if (statValue >= 1100) return BLUE_STAR_PROBABILITY.high;
    if (statValue >= 600) return BLUE_STAR_PROBABILITY.mid;
    return BLUE_STAR_PROBABILITY.low;
};

const countAncestorsWithSkill = (pair: BreedingPair, skillGroupId: number | undefined, inventoryMap: Map<number, Parent>, skillMapByName: Map<string, Skill>): number => {
  if (skillGroupId === undefined) return 0;
  const lineage: (Parent | ManualParentData | null)[] = [
    pair.p1, pair.p2,
    resolveGrandparent(pair.p1.grandparent1, inventoryMap), resolveGrandparent(pair.p1.grandparent2, inventoryMap),
    resolveGrandparent(pair.p2.grandparent1, inventoryMap), resolveGrandparent(pair.p2.grandparent2, inventoryMap),
  ];
  let count = 0;
  for (const member of lineage) {
    if (!member) continue;
    const skills = [...member.uniqueSparks, ...member.whiteSparks];
    if (skills.some(s => skillMapByName.get(s.name)?.groupId === skillGroupId)) count++;
  }
  return count;
};

function getBlueSparkDistribution(goal: Goal, targetStats: Record<string, number>, trainingRank: 'ss' | 'ss+'): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    for (const stat of BLUE_SPARK_TYPES) {
        const starProbs = getBlueStarDistributionForStat(targetStats[stat.toLowerCase()] || 0);
        for (const stars of [1, 2, 3] as const) {
            const prob = (1 / NUM_BLUE_STATS) * starProbs[stars];
            if (prob === 0) continue;
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: stat, stars }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            const blueScoreContribution = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            distribution.set(blueScoreContribution, (distribution.get(blueScoreContribution) || 0) + prob);
        }
    }
    return distribution;
}

function getPinkSparkDistribution(goal: Goal, trainingRank: 'ss' | 'ss+', targetAptitudes: string[]): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    const starProbs = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;
    
    const numObtainableAptitudes = Math.max(1, targetAptitudes.length);
    const numPrimaryMatches = goal.primaryPink.filter(p => targetAptitudes.includes(p)).length;
    
    const primaryProb = numPrimaryMatches / numObtainableAptitudes;
    const otherProb = 1 - primaryProb;

    for (const stars of [1, 2, 3] as const) {
        if (primaryProb > 0) {
            const primaryType = goal.primaryPink.find(p => targetAptitudes.includes(p)) || goal.primaryPink[0] || 'Other';
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: primaryType, stars }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            const pinkScore = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            distribution.set(pinkScore, (distribution.get(pinkScore) || 0) + (primaryProb * starProbs[stars]));
        }
        if (otherProb > 0) {
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: 'Other', stars }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            const pinkScore = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            distribution.set(pinkScore, (distribution.get(pinkScore) || 0) + (otherProb * starProbs[stars]));
        }
    }
    return distribution;
}

function getWhiteSparkDistribution(pair: BreedingPair, goal: Goal, trainingRank: 'ss' | 'ss+', skillMapByName: Map<string, Skill>, inventoryMap: Map<number, Parent>): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    const starProbs = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;
    const potentialSkills = Array.from(skillMapByName.values()).filter(s => s.type === 'normal');
    if (potentialSkills.length === 0) {
        distribution.set(0, 1.0);
        return distribution;
    }
    const numSkills = potentialSkills.length;
    let totalProbabilityMass = 0;
    potentialSkills.forEach(skill => {
        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        if (skill.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;
        if (skill.rarity && skill.rarity > 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.gold;
        const ancestorCount = countAncestorsWithSkill(pair, skill.groupId, inventoryMap, skillMapByName);
        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        for (const stars of [1, 2, 3] as const) {
            const probOfThisOutcome = acquireProb * starProbs[stars];
            const finalProb = probOfThisOutcome / numSkills;
            if (finalProb === 0) continue;
            const score = Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [{ name: skill.name_en, stars }] }, goal, [], skillMapByName, trainingRank));
            const whiteScoreContribution = score - Math.round(scoreHypotheticalParent({ blueSpark: { type: '', stars: 1 }, pinkSpark: { type: '', stars: 1 }, whiteSparks: [] }, goal, [], new Map(), trainingRank));
            distribution.set(whiteScoreContribution, (distribution.get(whiteScoreContribution) || 0) + finalProb);
            totalProbabilityMass += finalProb;
        }
    });
    distribution.set(0, (distribution.get(0) || 0) + (1 - totalProbabilityMass));
    return distribution;
}

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

const calculateUpgradeProbability = (
    pair: BreedingPair, 
    goal: Goal, 
    targetStats: Record<string, number>, 
    trainingRank: 'ss' | 'ss+', 
    inventoryMap: Map<number, Parent>, 
    skillMapByName: Map<string, Skill>, 
    spBudget: number,
    acquirableSkillIds: Set<string>,
    targetAptitudes: string[]
): number => {
    const p1Score = calculateIndividualScore(pair.p1, goal, inventoryMap, skillMapByName, trainingRank);
    const p2Score = calculateIndividualScore(pair.p2, goal, inventoryMap, skillMapByName, trainingRank);
    const targetIndividualScore = Math.min(p1Score, p2Score);
    const blueDist = getBlueSparkDistribution(goal, targetStats, trainingRank);
    const pinkDist = getPinkSparkDistribution(goal, trainingRank, targetAptitudes);
    const whiteDist = getWhiteSparkDistribution(pair, goal, trainingRank, skillMapByName, inventoryMap);
    const sparkCountDist = calculateSparkCountDistribution(pair, goal, spBudget, skillMapByName, inventoryMap, acquirableSkillIds);
    let totalUpgradeProb = 0;
    for (const [sparkCount, countProb] of sparkCountDist.entries()) {
        if (countProb === 0) continue;
        let finalDist = convolve(blueDist, pinkDist);
        for (let i = 0; i < sparkCount; i++) {
            finalDist = convolve(finalDist, whiteDist);
        }
        let upgradeProbForThisCount = 0;
        for (const [score, scoreProb] of finalDist.entries()) {
            if (score > targetIndividualScore) {
                upgradeProbForThisCount += scoreProb;
            }
        }
        totalUpgradeProb += upgradeProbForThisCount * countProb;
    }
    return totalUpgradeProb;
};