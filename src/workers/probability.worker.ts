import { BreedingPair, Goal, ManualParentData, Parent, Skill, WhiteSpark, UniqueSpark } from '../types';
import { resolveGrandparent } from '../utils/affinity';
import { calculateIndividualScore } from '../utils/scoring';
import { calculateSparkCountDistribution } from '../utils/sparkAcquisitionModel';

// --- Worker Entry Point ---

self.onmessage = (e: MessageEvent<any>) => {
    const { 
        pair, goal, targetStats, trainingRank, 
        inventory, skillMapEntries, spBudget,
        acquirableSkillIds, targetAptitudes
    } = e.data;

    const inventoryMap = new Map<number, Parent>(inventory.map((p: Parent) => [p.id, p]));
    const skillMapByName = new Map<string, Skill>(skillMapEntries);
    const acquirableSkillIdsSet = new Set<string>(acquirableSkillIds);

    try {
        const result = calculateUpgradeProbability(
            pair, goal, targetStats, trainingRank, 
            inventoryMap, skillMapByName, spBudget,
            acquirableSkillIdsSet, targetAptitudes
        );
        self.postMessage({ result });
    } catch (error) {
        self.postMessage({ error: error instanceof Error ? error.message : 'Unknown worker error' });
    }
};


// --- Core Calculation Logic ---

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

const WHITE_SKILL_BASE_PROBABILITY = { normal: 0.20, circle: 0.25, gold: 0.40 };
const ANCESTOR_BONUS = 1.1;

type ProbabilityDistribution = Map<number, number>;

// Helper function to calculate a single spark's score contribution
const getSparkScoreContribution = (
    sparkType: 'blue' | 'pink' | 'white',
    sparkData: any,
    goal: Goal,
    skillMapByName: Map<string, Skill>,
    trainingRank: 'ss' | 'ss+'
): number => {
    const baseScore = calculateIndividualScore({
        blueSpark: { type: 'Speed', stars: 1 }, pinkSpark: { type: 'Turf', stars: 1 },
        whiteSparks: [], uniqueSparks: [],
    }, goal, new Map(), skillMapByName, trainingRank);

    let testEntity: ManualParentData = {
        blueSpark: { type: 'Speed', stars: 1 }, pinkSpark: { type: 'Turf', stars: 1 },
        whiteSparks: [], uniqueSparks: [],
    };

    if (sparkType === 'blue') testEntity.blueSpark = sparkData;
    if (sparkType === 'pink') testEntity.pinkSpark = sparkData;
    if (sparkType === 'white') testEntity.whiteSparks = [sparkData];
    
    const totalScore = calculateIndividualScore(testEntity, goal, new Map(), skillMapByName, trainingRank);

    return Math.round(totalScore - baseScore);
};

const getBlueStarDistributionForStat = (statValue: number): { 1: number; 2: number; 3: number } => {
    if (statValue >= 1100) return BLUE_STAR_PROBABILITY.high;
    if (statValue >= 600) return BLUE_STAR_PROBABILITY.mid;
    return BLUE_STAR_PROBABILITY.low;
};

function getBlueSparkDistribution(goal: Goal, targetStats: Record<string, number>, skillMapByName: Map<string, Skill>, trainingRank: 'ss' | 'ss+'): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    for (const stat of BLUE_SPARK_TYPES) {
        const starProbs = getBlueStarDistributionForStat(targetStats[stat.toLowerCase()] || 0);
        for (const stars of [1, 2, 3] as const) {
            const prob = (1 / NUM_BLUE_STATS) * starProbs[stars];
            if (prob === 0) continue;
            
            const score = getSparkScoreContribution('blue', { type: stat, stars }, goal, skillMapByName, trainingRank);
            distribution.set(score, (distribution.get(score) || 0) + prob);
        }
    }
    return distribution;
}

function getPinkSparkDistribution(goal: Goal, trainingRank: 'ss' | 'ss+', targetAptitudes: string[], skillMapByName: Map<string, Skill>): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    const starProbs = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;
    
    const numObtainableAptitudes = Math.max(1, targetAptitudes.length);
    const numPrimaryMatches = goal.primaryPink.filter(p => targetAptitudes.includes(p)).length;
    
    const primaryProb = numPrimaryMatches / numObtainableAptitudes;
    const otherProb = 1 - primaryProb;

    for (const stars of [1, 2, 3] as const) {
        if (primaryProb > 0) {
            const primaryType = goal.primaryPink.find(p => targetAptitudes.includes(p)) || goal.primaryPink[0] || 'Other';
            const score = getSparkScoreContribution('pink', { type: primaryType, stars }, goal, skillMapByName, trainingRank);
            distribution.set(score, (distribution.get(score) || 0) + (primaryProb * starProbs[stars]));
        }
        if (otherProb > 0) {
            const score = getSparkScoreContribution('pink', { type: 'Other', stars }, goal, skillMapByName, trainingRank);
            distribution.set(score, (distribution.get(score) || 0) + (otherProb * starProbs[stars]));
        }
    }
    return distribution;
}

function getAverageWhiteSparkScoreDistribution(pair: BreedingPair, goal: Goal, trainingRank: 'ss' | 'ss+', skillMapByName: Map<string, Skill>, inventoryMap: Map<number, Parent>, acquirableSkillIds: Set<string>): ProbabilityDistribution {
    const mixtureDist: ProbabilityDistribution = new Map();
    const starProbs = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus : STAR_PROBABILITY.standard;
    const allSkillsFromMap = Array.from(skillMapByName.values());

    let skillPool: Skill[];
    if (acquirableSkillIds.size === 0) {
        const lineageSkillNames = new Set<string>();
        const lineage = [pair.p1, pair.p2, resolveGrandparent(pair.p1.grandparent1, inventoryMap), resolveGrandparent(pair.p1.grandparent2, inventoryMap), resolveGrandparent(pair.p2.grandparent1, inventoryMap), resolveGrandparent(pair.p2.grandparent2, inventoryMap)];
        lineage.forEach(member => {
            if (member) member.whiteSparks.forEach(spark => lineageSkillNames.add(spark.name));
        });
        skillPool = Array.from(lineageSkillNames).map(name => skillMapByName.get(name)).filter((s): s is Skill => !!s && s.type === 'normal');
    } else {
        skillPool = Array.from(acquirableSkillIds).map(id => allSkillsFromMap.find(s => s.id === id)).filter((s): s is Skill => !!s);
    }

    if (skillPool.length === 0) return new Map([[0, 1.0]]);
    
    const weightedSkills = skillPool.map(skill => {
        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        if (skill.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;

        const lineage = [pair.p1, pair.p2, resolveGrandparent(pair.p1.grandparent1, inventoryMap), resolveGrandparent(pair.p1.grandparent2, inventoryMap), resolveGrandparent(pair.p2.grandparent1, inventoryMap), resolveGrandparent(pair.p2.grandparent2, inventoryMap)];
        const ancestorCount = lineage.filter(member => member && member.whiteSparks.some(s => skillMapByName.get(s.name)?.groupId === skill.groupId)).length;
        
        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        return { skill, acquireProb };
    });

    const totalAcquireProb = weightedSkills.reduce((sum, s) => sum + s.acquireProb, 0);
    if (totalAcquireProb === 0) return new Map([[0, 1.0]]);

    for (const { skill, acquireProb } of weightedSkills) {
        const weight = acquireProb / totalAcquireProb;
        for (const stars of [1, 2, 3] as const) {
            const score = getSparkScoreContribution('white', { name: skill.name_en, stars }, goal, skillMapByName, trainingRank);
            const prob = weight * starProbs[stars];
            mixtureDist.set(score, (mixtureDist.get(score) || 0) + prob);
        }
    }
    return mixtureDist;
}

function convolve(dist1: ProbabilityDistribution, dist2: ProbabilityDistribution): ProbabilityDistribution {
    const newDist: ProbabilityDistribution = new Map();
    if (dist1.size === 0) return dist2;
    if (dist2.size === 0) return dist1;
    
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
    pair: BreedingPair, goal: Goal, targetStats: Record<string, number