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
 * Calculates a probability distribution for the number of white sparks acquired during a training run.
 * This function implements a dynamic programming approach to solve the stochastic knapsack problem,
 * where items (skills) have a cost, a probability of being available, and the goal is to find the
 * probability distribution of the number of items taken given a budget constraint.
 *
 * @param pair The breeding pair.
 * @param goal The user's active goal containing the wishlist.
 * @param spBudget The estimated total Skill Points available for purchases.
 * @param skillMapByName Map to look up skill details by English name.
 * @param inventoryMap Map of all parents in the user's inventory.
 * @param acquirableSkillIds A set of skill IDs the user has defined as being available in the run.
 * @returns A Map where the key is the number of sparks acquired and the value is the probability of that count occurring.
 */
export const calculateSparkCountDistribution = (
    pair: BreedingPair,
    goal: Goal,
    spBudget: number,
    skillMapByName: Map<string, Skill>,
    inventoryMap: Map<number, Parent>,
    acquirableSkillIds: Set<string>
): Map<number, number> => {
    
    // --- 1. Preprocessing: Build and sort the pool of potential skills ---
    const lineage: (Parent | ManualParentData | null)[] = [
        pair.p1, pair.p2,
        resolveGrandparent(pair.p1.grandparent1, inventoryMap), resolveGrandparent(pair.p1.grandparent2, inventoryMap),
        resolveGrandparent(pair.p2.grandparent1, inventoryMap), resolveGrandparent(pair.p2.grandparent2, inventoryMap),
    ];
    
    const wishlistMap = new Map(goal.wishlist.map(item => [item.name, item.tier]));
    const allSkillsFromMap = Array.from(skillMapByName.values());

    let skillPool: Skill[];
    if (acquirableSkillIds.size === 0) {
        const lineageSkillNames = new Set<string>();
        lineage.forEach(member => {
            if (member) member.whiteSparks.forEach(spark => lineageSkillNames.add(spark.name));
        });
        skillPool = Array.from(lineageSkillNames).map(name => skillMapByName.get(name)).filter((s): s is Skill => !!s && s.type === 'normal');
    } else {
        skillPool = Array.from(acquirableSkillIds).map(id => allSkillsFromMap.find(s => s.id === id)).filter((s): s is Skill => !!s);
    }

    const potentialSkills = skillPool.map(skill => {
        const cost = skill.baseCost || 150;
        const tier = wishlistMap.get(skill.name_en) || 'Other';
        const ancestorCount = lineage.filter(member => 
            member && member.whiteSparks.some(s => skillMapByName.get(s.name)?.groupId === skill.groupId)
        ).length;

        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        if (skill.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;

        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        
        return {
            tier: tier as 'S' | 'A' | 'B' | 'C' | 'Other',
            cost,
            acquireProb,
            level: skill.rarity || 1,
        };
    });

    const sortedSkills = potentialSkills.sort((a, b) => {
        const tierDiff = WISH_RANK_ORDER[a.tier] - WISH_RANK_ORDER[b.tier];
        if (tierDiff !== 0) return tierDiff;
        const levelDiff = a.level - b.level;
        if (levelDiff !== 0) return levelDiff;
        return a.cost - b.cost;
    });

    // --- 2. Dynamic Programming: Calculate distributions considering budget ---
    // The DP state tracks the probability of achieving a certain (count, cost) combination.
    // dp: Map<cost, Map<count, probability>>
    let dp = new Map<number, Map<number, number>>();
    dp.set(0, new Map([[0, 1.0]])); // Initial state: 0 cost, 0 skills, 100% probability

    for (const skill of sortedSkills) {
        const nextDp = new Map<number, Map<number, number>>();
        
        for (const [cost, countDist] of dp.entries()) {
            for (const [count, prob] of countDist.entries()) {
                if (prob === 0) continue;

                // Path 1: Skill is NOT acquired. Probability = prob * (1 - skill.acquireProb)
                // The cost and count remain the same for this branch.
                const probNotAcquired = prob * (1 - skill.acquireProb);
                if (!nextDp.has(cost)) nextDp.set(cost, new Map());
                const nextCountDist = nextDp.get(cost)!;
                nextCountDist.set(count, (nextCountDist.get(count) || 0) + probNotAcquired);

                // Path 2: Skill IS acquired. Probability = prob * skill.acquireProb
                // The cost and count both increase. This path is only possible if budget allows.
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

    // --- 3. Aggregation: Combine results from all budget paths ---
    // Sum the probabilities for each possible skill count across all final costs.
    const finalDistribution = new Map<number, number>();
    for (const countDist of dp.values()) {
        for (const [count, prob] of countDist.entries()) {
            finalDistribution.set(count, (finalDistribution.get(count) || 0) + prob);
        }
    }

    return finalDistribution;
};