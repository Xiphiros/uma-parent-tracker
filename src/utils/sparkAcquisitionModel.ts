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
    
    const lineage: (Parent | ManualParentData | null)[] = [
        pair.p1,
        pair.p2,
        resolveGrandparent(pair.p1.grandparent1, inventoryMap),
        resolveGrandparent(pair.p1.grandparent2, inventoryMap),
        resolveGrandparent(pair.p2.grandparent1, inventoryMap),
        resolveGrandparent(pair.p2.grandparent2, inventoryMap),
    ];
    
    const wishlistMap = new Map(goal.wishlist.map(item => [item.name, item.tier]));

    // 1. Filter the skill universe down to only what the user has selected as acquirable.
    // If the user has selected none, consider all skills from the lineage as acquirable.
    let skillPool: Skill[];
    if (acquirableSkillIds.size === 0) {
        const lineageSkillNames = new Set<string>();
        lineage.forEach(member => {
            if (member) {
                member.whiteSparks.forEach(spark => lineageSkillNames.add(spark.name));
            }
        });
        skillPool = Array.from(lineageSkillNames).map(name => skillMapByName.get(name)).filter((s): s is Skill => !!s);
    } else {
        skillPool = Array.from(acquirableSkillIds).map(id => Array.from(skillMapByName.values()).find(s => s.id === id)).filter((s): s is Skill => !!s);
    }

    // 2. Decorate each skill with its priority, cost, and acquisition probability.
    const potentialSkills = skillPool.map(skill => {
        const cost = skill.baseCost || 150;
        const tier = wishlistMap.get(skill.name_en) || 'Other';
        
        const ancestorCount = lineage.filter(member => 
            member && member.whiteSparks.some(s => {
                const sInfo = skillMapByName.get(s.name);
                return sInfo?.groupId === skill.groupId;
            })
        ).length;

        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        if (skill.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;

        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));
        
        return {
            name: skill.name_en,
            tier: tier as 'S' | 'A' | 'B' | 'C' | 'Other',
            cost,
            acquireProb,
            level: skill.rarity || 1, // Add level (rarity) for sorting
        };
    });

    // 3. Sort skills by the new priority: Tier (S->C->Other), then Level (1->2), then Cost (low->high)
    const sortedSkills = potentialSkills.sort((a, b) => {
        const tierDiff = WISH_RANK_ORDER[a.tier] - WISH_RANK_ORDER[b.tier];
        if (tierDiff !== 0) return tierDiff;

        const levelDiff = a.level - b.level;
        if (levelDiff !== 0) return levelDiff;

        return a.cost - b.cost;
    });

    // 4. Use DP to calculate the distribution of spark counts
    let distribution = new Map<number, number>([[0, 1.0]]); // { num_sparks: probability }
    let remainingBudget = spBudget;

    for (const skill of sortedSkills) {
        if (remainingBudget < skill.cost) {
            // Cannot afford this or any subsequent (more expensive or lower priority) skills.
            // We can break early because the list is sorted by cost within each priority level.
            // Note: This assumes Lv1 is always cheaper or same cost as Lv2. If not, this needs adjustment.
            // For now, this is a safe assumption for Umamusume skill costs.
            continue;
        }

        const pAcquire = skill.acquireProb;
        const nextDistribution = new Map<number, number>();

        for (const [count, prob] of distribution.entries()) {
            // Case 1: Skill is acquired (and we can afford it)
            if (remainingBudget >= skill.cost) {
                const probAcquired = prob * pAcquire;
                nextDistribution.set(count + 1, (nextDistribution.get(count + 1) || 0) + probAcquired);
            }

            // Case 2: Skill is not acquired
            const probNotAcquired = prob * (1 - pAcquire);
            nextDistribution.set(count, (nextDistribution.get(count) || 0) + probNotAcquired);
        }
        
        distribution = nextDistribution;
        
        // This simplified budget deduction works because we only care about the distribution of *counts*,
        // not the distribution of remaining budget. We iterate through the sorted list and "attempt"
        // to buy each one, updating the probabilities as we go. We just need to make sure we don't
        // attempt to buy something we can't afford at all. A more complex model would track budget distribution.
        remainingBudget -= skill.cost;
    }

    return distribution;
};