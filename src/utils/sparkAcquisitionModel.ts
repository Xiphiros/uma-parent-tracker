import { BreedingPair, Goal, ManualParentData, Parent, Skill } from '../types';
import { resolveGrandparent } from './affinity';

const WHITE_SKILL_BASE_PROBABILITY = {
    normal: 0.20,
    circle: 0.25,
    gold: 0.40,
};
const ANCESTOR_BONUS = 1.1;
const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

/**
 * Calculates a probability distribution for the number of white sparks acquired during a training run.
 * @param pair The breeding pair.
 * @param goal The user's active goal containing the wishlist.
 * @param spBudget The estimated total Skill Points available for purchases.
 * @param skillMapByName Map to look up skill details by English name.
 * @param skillMetaMap Map to look up skill metadata (like cost) by ID.
 * @param inventoryMap Map of all parents in the user's inventory.
 * @returns A Map where the key is the number of sparks acquired and the value is the probability of that count occurring.
 */
export const calculateSparkCountDistribution = (
    pair: BreedingPair,
    goal: Goal,
    spBudget: number,
    skillMapByName: Map<string, Skill>,
    skillMetaMap: Map<string, { baseCost: number }>,
    inventoryMap: Map<number, Parent>
): Map<number, number> => {
    
    const lineage: (Parent | ManualParentData | null)[] = [
        pair.p1,
        pair.p2,
        resolveGrandparent(pair.p1.grandparent1, inventoryMap),
        resolveGrandparent(pair.p1.grandparent2, inventoryMap),
        resolveGrandparent(pair.p2.grandparent1, inventoryMap),
        resolveGrandparent(pair.p2.grandparent2, inventoryMap),
    ];

    // 1. Get all unique, inheritable white skills from the lineage that are on the wishlist.
    const potentialSkills = new Map<string, { name: string, tier: 'S' | 'A' | 'B' | 'C', cost: number, acquireProb: number }>();
    
    goal.wishlist.forEach(wishlistItem => {
        const skill = skillMapByName.get(wishlistItem.name);
        if (!skill || skill.type !== 'normal') return;

        const skillMeta = skillMetaMap.get(skill.id);
        const cost = skillMeta?.baseCost || 150; // Default cost if not found

        // Calculate ancestor count for this skill's group
        const ancestorCount = lineage.filter(member => 
            member && member.whiteSparks.some(s => {
                const sInfo = skillMapByName.get(s.name);
                return sInfo?.groupId === skill.groupId;
            })
        ).length;

        let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
        if (skill.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;

        const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));

        potentialSkills.set(skill.name_en, {
            name: skill.name_en,
            tier: wishlistItem.tier,
            cost,
            acquireProb,
        });
    });

    // 2. Sort skills by priority: Tier (S->C), then Cost (low->high)
    const sortedSkills = Array.from(potentialSkills.values()).sort((a, b) => {
        const tierDiff = WISH_RANK_ORDER[a.tier] - WISH_RANK_ORDER[b.tier];
        if (tierDiff !== 0) return tierDiff;
        return a.cost - b.cost;
    });

    // 3. Use DP to calculate the distribution of spark counts
    let distribution = new Map<number, number>([[0, 1.0]]); // { num_sparks: probability }
    let remainingBudget = spBudget;

    for (const skill of sortedSkills) {
        if (remainingBudget < skill.cost) {
            break; // Cannot afford this or any subsequent skills
        }

        const pAcquire = skill.acquireProb;
        const nextDistribution = new Map<number, number>();

        for (const [count, prob] of distribution.entries()) {
            // Case 1: Skill is acquired
            const probAcquired = prob * pAcquire;
            nextDistribution.set(count + 1, (nextDistribution.get(count + 1) || 0) + probAcquired);

            // Case 2: Skill is not acquired
            const probNotAcquired = prob * (1 - pAcquire);
            nextDistribution.set(count, (nextDistribution.get(count) || 0) + probNotAcquired);
        }
        
        distribution = nextDistribution;
        remainingBudget -= skill.cost;
    }

    return distribution;
};