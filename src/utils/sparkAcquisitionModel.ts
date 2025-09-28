import { BreedingPair, Goal, ManualParentData, Parent, Skill } from '../types';
import { resolveGrandparent } from './affinity';

const WHITE_SKILL_BASE_PROBABILITY = {
    normal: 0.20,
    circle: 0.25,
    gold: 0.40,
};
const ANCESTOR_BONUS = 1.1;
const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3, Other: 4 };

/**
 * Calculates the probability distribution for acquiring a set of items, each with an independent probability.
 * @param items An array of items, each with an `acquireProb`.
 * @returns A Map where the key is the number of items acquired and the value is the probability.
 */
const calculateFreeItemDistribution = (items: { acquireProb: number }[]): Map<number, number> => {
    let distribution = new Map<number, number>([[0, 1.0]]);

    for (const item of items) {
        const nextDist = new Map<number, number>();
        for (const [count, prob] of distribution.entries()) {
            // Path 1: Item is NOT acquired
            const probNotAcquired = prob * (1 - item.acquireProb);
            nextDist.set(count, (nextDist.get(count) || 0) + probNotAcquired);

            // Path 2: Item IS acquired
            const probAcquired = prob * item.acquireProb;
            nextDist.set(count + 1, (nextDist.get(count + 1) || 0) + probAcquired);
        }
        distribution = nextDist;
    }
    return distribution;
};

/**
 * Calculates a probability distribution for the number of white sparks acquired during a training run.
 * @returns An object containing two separate probability distributions: one for free sparks and one for purchased sparks.
 */
export const calculateSparkCountDistribution = (
    pair: BreedingPair,
    goal: Goal,
    spBudget: number,
    skillMapByName: Map<string, Skill>,
    inventoryMap: Map<number, Parent>,
    acquirableSkillIds: Set<number>,
    conditionalSkillIds: Set<number>
): { freeSparksDist: Map<number, number>, purchasedSparksDist: Map<number, number> } => {
    
    const lineage: (Parent | ManualParentData | null)[] = [
        pair.p1, pair.p2,
        resolveGrandparent(pair.p1.grandparent1, inventoryMap), resolveGrandparent(pair.p1.grandparent2, inventoryMap),
        resolveGrandparent(pair.p2.grandparent1, inventoryMap), resolveGrandparent(pair.p2.grandparent2, inventoryMap),
    ];
    const allSkillsFromMap = Array.from(skillMapByName.values());

    // --- Phase 1: Calculate distribution for Conditional (Free) Sparks ---
    const conditionalSkills = Array.from(conditionalSkillIds)
        .map(id => allSkillsFromMap.find(s => s.id === id))
        .filter((s): s is Skill => !!s);
    
    const conditionalItems = conditionalSkills.map(skill => {
        const ancestorCount = lineage.filter(member => 
            member && member.whiteSparks.some(s => skillMapByName.get(s.name)?.id === skill.id)
        ).length;
        const acquireProb = Math.min(1.0, WHITE_SKILL_BASE_PROBABILITY.normal * (ANCESTOR_BONUS ** ancestorCount));
        return { acquireProb };
    });

    const freeSparksDist = calculateFreeItemDistribution(conditionalItems);

    // --- Phase 2: Calculate distribution for Purchasable Sparks ---
    let purchasableSkillPool: Skill[];
    if (acquirableSkillIds.size === 0) {
        const lineageSkillNames = new Set<string>();
        lineage.forEach(member => {
            if (member) member.whiteSparks.forEach(spark => lineageSkillNames.add(spark.name));
        });
        purchasableSkillPool = Array.from(lineageSkillNames)
            .map(name => skillMapByName.get(name))
            .filter((s): s is Skill => !!s && s.category === 'white' && s.factorType === 4);
    } else {
        purchasableSkillPool = Array.from(acquirableSkillIds)
            .map(id => allSkillsFromMap.find(s => s.id === id))
            .filter((s): s is Skill => !!s);
    }
    
    const wishlistMap = new Map(goal.wishlist.map(item => [item.name, item.tier]));
    const potentialPurchases = purchasableSkillPool.map(skill => {
        const cost = skill.sp_cost || 150;
        const tier = wishlistMap.get(skill.name_en) || 'Other';
        const ancestorCount = lineage.filter(member => 
            member && member.whiteSparks.some(s => skillMapByName.get(s.name)?.id === skill.id)
        ).length;

        // Simplified rarity check for base prob
        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;

        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        
        return { tier: tier as 'S' | 'A' | 'B' | 'C' | 'Other', cost, acquireProb, level: 1 }; // Assume level 1 for now
    });

    const sortedPurchases = potentialPurchases.sort((a, b) => {
        const tierDiff = WISH_RANK_ORDER[a.tier] - WISH_RANK_ORDER[b.tier];
        if (tierDiff !== 0) return tierDiff;
        const levelDiff = a.level - b.level;
        if (levelDiff !== 0) return levelDiff;
        return a.cost - b.cost;
    });

    // DP state: Map<cost, Map<count, probability>>
    let dp = new Map<number, Map<number, number>>([[0, new Map([[0, 1.0]])]]);

    for (const skill of sortedPurchases) {
        const nextDp = new Map<number, Map<number, number>>();
        for (const [cost, countDist] of dp.entries()) {
            for (const [count, prob] of countDist.entries()) {
                if (prob === 0) continue;

                const probNotAcquired = prob * (1 - skill.acquireProb);
                if (!nextDp.has(cost)) nextDp.set(cost, new Map());
                const nextCountDist = nextDp.get(cost)!;
                nextCountDist.set(count, (nextCountDist.get(count) || 0) + probNotAcquired);

                const newCost = cost + skill.cost;
                if (newCost <= spBudget) {
                    const probAcquired = prob * skill.acquireProb;
                    if (!nextDp.has(newCost)) nextDp.set(newCost, new Map());
                    const nextCountDistAcquired = nextDp.get(newCost)!;
                    nextCountDistAcquired.set(count + 1, (nextCountDistAcquired.get(count + 1) || 0) + probAcquired);
                }
            }
        }
        dp = nextDp;
    }
    
    const purchasedSparksDist = new Map<number, number>();
    for (const countDist of dp.values()) {
        for (const [count, prob] of countDist.entries()) {
            purchasedSparksDist.set(count, (purchasedSparksDist.get(count) || 0) + prob);
        }
    }

    return { freeSparksDist, purchasedSparksDist };
};