import { BreedingPair, Goal, ManualParentData, Parent, Skill } from '../types';
import { resolveGrandparent } from '../utils/affinity';
import { calculateIndividualScore } from '../utils/scoring';
import { calculateSparkCountDistribution } from '../utils/sparkAcquisitionModel';
import { ProbabilityWorkerPayload } from '../utils/upgradeProbability';

// --- Worker Entry Point ---

self.onmessage = (e: MessageEvent<ProbabilityWorkerPayload>) => {
    const { 
        pair, p1DisplayName, p2DisplayName, calculationMode, goal, targetStats, trainingRank, 
        inventory, skillMapEntries, spBudget,
        acquirableSkillIds, conditionalSkillIds, targetAptitudes
    } = e.data;

    const inventoryMap = new Map<number, Parent>(inventory.map((p: Parent) => [p.id, p]));
    const skillMapByName = new Map<string, Skill>(skillMapEntries);
    const acquirableSkillIdsSet = new Set<number>(acquirableSkillIds);
    const conditionalSkillIdsSet = new Set<number>(conditionalSkillIds);

    try {
        const result = calculateUpgradeProbability(
            pair, p1DisplayName, p2DisplayName, calculationMode, goal, targetStats, trainingRank, 
            inventoryMap, skillMapByName, spBudget,
            acquirableSkillIdsSet, conditionalSkillIdsSet, targetAptitudes
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

const getSparkScoreContribution = (
    sparkType: 'blue' | 'pink' | 'white',
    sparkData: any,
    goal: Goal,
    skillMapByName: Map<string, Skill>
): number => {
    const baseScore = calculateIndividualScore({
        blueSpark: { type: 'Speed', stars: 1 }, pinkSpark: { type: 'Turf', stars: 1 },
        whiteSparks: [], uniqueSparks: [],
    }, goal, new Map(), skillMapByName);

    let testEntity: ManualParentData = {
        blueSpark: { type: 'Speed', stars: 1 }, pinkSpark: { type: 'Turf', stars: 1 },
        whiteSparks: [], uniqueSparks: [],
    };

    if (sparkType === 'blue') testEntity.blueSpark = sparkData;
    if (sparkType === 'pink') testEntity.pinkSpark = sparkData;
    if (sparkType === 'white') testEntity.whiteSparks = [sparkData];
    
    const totalScore = calculateIndividualScore(testEntity, goal, new Map(), skillMapByName);

    return Math.round(totalScore - baseScore);
};

const getBlueStarDistributionForStat = (statValue: number): { 1: number; 2: number; 3: number } => {
    if (statValue >= 1100) return BLUE_STAR_PROBABILITY.high;
    if (statValue >= 600) return BLUE_STAR_PROBABILITY.mid;
    return BLUE_STAR_PROBABILITY.low;
};

function getBlueSparkDistribution(goal: Goal, targetStats: Record<string, number>, skillMapByName: Map<string, Skill>): ProbabilityDistribution {
    const distribution: ProbabilityDistribution = new Map();
    for (const stat of BLUE_SPARK_TYPES) {
        const starProbs = getBlueStarDistributionForStat(targetStats[stat.toLowerCase()] || 0);
        for (const stars of [1, 2, 3] as const) {
            const prob = (1 / NUM_BLUE_STATS) * starProbs[stars];
            if (prob === 0) continue;
            
            const score = getSparkScoreContribution('blue', { type: stat, stars }, goal, skillMapByName);
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
            const score = getSparkScoreContribution('pink', { type: primaryType, stars }, goal, skillMapByName);
            distribution.set(score, (distribution.get(score) || 0) + (primaryProb * starProbs[stars]));
        }
        if (otherProb > 0) {
            const score = getSparkScoreContribution('pink', { type: 'Other', stars }, goal, skillMapByName);
            distribution.set(score, (distribution.get(score) || 0) + (otherProb * starProbs[stars]));
        }
    }
    return distribution;
}

function getAverageSparkScoreDistributionForPool(skillPool: Skill[], pair: BreedingPair, goal: Goal, skillMapByName: Map<string, Skill>, inventoryMap: Map<number, Parent>): ProbabilityDistribution {
    const mixtureDist: ProbabilityDistribution = new Map();
    const starProbs = STAR_PROBABILITY.standard; // Assume standard for white sparks for now
    const lineage = [pair.p1, pair.p2, resolveGrandparent(pair.p1.grandparent1, inventoryMap), resolveGrandparent(pair.p1.grandparent2, inventoryMap), resolveGrandparent(pair.p2.grandparent1, inventoryMap), resolveGrandparent(pair.p2.grandparent2, inventoryMap)];

    if (skillPool.length === 0) return new Map([[0, 1.0]]);
    
    const weightedSkills = skillPool.map(skill => {
        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        
        const ancestorCount = lineage.filter(member => member && member.whiteSparks.some(s => {
            const sInfo = skillMapByName.get(s.name);
            return sInfo?.id === skill.id;
        })).length;
        
        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        return { skill, acquireProb };
    });

    const totalAcquireProb = weightedSkills.reduce((sum, s) => sum + s.acquireProb, 0);
    if (totalAcquireProb === 0) return new Map([[0, 1.0]]);

    for (const { skill, acquireProb } of weightedSkills) {
        const weight = acquireProb / totalAcquireProb;
        for (const stars of [1, 2, 3] as const) {
            const score = getSparkScoreContribution('white', { name: skill.name_en, stars }, goal, skillMapByName);
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
    pair: BreedingPair, p1DisplayName: string, p2DisplayName: string, calculationMode: 'final' | 'individual',
    goal: Goal, targetStats: Record<string, number>, trainingRank: 'ss' | 'ss+', 
    inventoryMap: Map<number, Parent>, skillMapByName: Map<string, Skill>, spBudget: number,
    acquirableSkillIds: Set<number>, conditionalSkillIds: Set<number>, targetAptitudes: string[]
) => {
    
    // --- New Target Score Logic ---
    const p1IndividualScore = calculateIndividualScore(pair.p1, goal, inventoryMap, skillMapByName);
    const p2IndividualScore = calculateIndividualScore(pair.p2, goal, inventoryMap, skillMapByName);

    let weakerParent: Parent;
    let targetParentName: string;
    let targetParentFinalScore: number;
    let targetParentIndividualScore: number;
    let requiredIndividualScore: number;
    
    if (calculationMode === 'individual') {
        if (p1IndividualScore < p2IndividualScore) {
            weakerParent = pair.p1;
            targetParentName = p1DisplayName;
            targetParentFinalScore = weakerParent.score;
            targetParentIndividualScore = p1IndividualScore;
        } else {
            weakerParent = pair.p2;
            targetParentName = p2DisplayName;
            targetParentFinalScore = weakerParent.score;
            targetParentIndividualScore = p2IndividualScore;
        }
        requiredIndividualScore = targetParentIndividualScore;
    } else { // 'final' mode
        if (pair.p1.score < pair.p2.score) {
            weakerParent = pair.p1;
            targetParentName = p1DisplayName;
            targetParentIndividualScore = p1IndividualScore;
        } else {
            weakerParent = pair.p2;
            targetParentName = p2DisplayName;
            targetParentIndividualScore = p2IndividualScore;
        }
        targetParentFinalScore = weakerParent.score;
        const grandparentBonusForChild = (p1IndividualScore * 0.5) + (p2IndividualScore * 0.5);
        requiredIndividualScore = targetParentFinalScore - grandparentBonusForChild;
    }

    const targetSparkCount = weakerParent.whiteSparks.length;

    // --- Phase 1: Get Score and Count Distributions ---
    const blueDist = getBlueSparkDistribution(goal, targetStats, skillMapByName);
    const pinkDist = getPinkSparkDistribution(goal, trainingRank, targetAptitudes, skillMapByName);
    const baseScoreDist = convolve(blueDist, pinkDist);

    const { freeSparksDist, purchasedSparksDist } = calculateSparkCountDistribution(
        pair, goal, spBudget, skillMapByName, inventoryMap, acquirableSkillIds, conditionalSkillIds
    );
    
    // --- Phase 2: Create Average Score Distributions for Each Spark Type ---
    const allSkills = Array.from(skillMapByName.values());
    const conditionalSkillsPool = Array.from(conditionalSkillIds).map(id => allSkills.find(s => s.id === id)).filter((s): s is Skill => !!s);
    const purchasableSkillsPool = Array.from(acquirableSkillIds).map(id => allSkills.find(s => s.id === id)).filter((s): s is Skill => !!s);

    const avgFreeScoreDist = getAverageSparkScoreDistributionForPool(conditionalSkillsPool, pair, goal, skillMapByName, inventoryMap);
    const avgPurchasedScoreDist = getAverageSparkScoreDistributionForPool(purchasableSkillsPool, pair, goal, skillMapByName, inventoryMap);

    // --- Phase 3: Synthesize Final Score Distribution ---
    let finalScoreDist: ProbabilityDistribution = new Map();

    for (const [kFree, pFree] of freeSparksDist.entries()) {
        let scoreDistAfterFree = baseScoreDist;
        for (let i = 0; i < kFree; i++) {
            scoreDistAfterFree = convolve(scoreDistAfterFree, avgFreeScoreDist);
        }

        for (const [kPurchased, pPurchased] of purchasedSparksDist.entries()) {
            let scoreDistAfterPurchased = scoreDistAfterFree;
            for (let i = 0; i < kPurchased; i++) {
                scoreDistAfterPurchased = convolve(scoreDistAfterPurchased, avgPurchasedScoreDist);
            }

            const kTotal = kFree + kPurchased;
            const bonusMultiplier = 1 + (kTotal * 0.01);
            const pathProb = pFree * pPurchased;

            for (const [score, prob] of scoreDistAfterPurchased.entries()) {
                const finalScore = Math.round(score * bonusMultiplier);
                const finalProb = prob * pathProb;
                finalScoreDist.set(finalScore, (finalScoreDist.get(finalScore) || 0) + finalProb);
            }
        }
    }
    
    // --- Phase 4: Calculate Final Probabilities ---
    let probScoreUpgrade = 0;
    for (const [score, prob] of finalScoreDist.entries()) {
        if (score > requiredIndividualScore) {
            probScoreUpgrade += prob;
        }
    }
    
    const totalSparkCountDist = convolve(freeSparksDist, purchasedSparksDist);
    let probSparkCountUpgrade = 0;
    for (const [count, prob] of totalSparkCountDist.entries()) {
        if (count > targetSparkCount) {
            probSparkCountUpgrade += prob;
        }
    }
    
    return { probScoreUpgrade, probSparkCountUpgrade, targetSparkCount, targetParentName, targetParentFinalScore, targetParentIndividualScore };
};