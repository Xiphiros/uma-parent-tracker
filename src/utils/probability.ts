import { BreedingPair, Goal, ManualParentData, Parent, Skill, Uma, WishlistItem } from '../types';
import { resolveGrandparent } from './affinity';

// --- Constants from Reference Documents ---

const STAR_PROBABILITY = {
  standard: { 1: 0.50, 2: 0.45, 3: 0.05 }, // For ranks below SS
  ssPlus: { 1: 0.20, 2: 0.70, 3: 0.10 },   // For ranks SS+ and higher
};

const WHITE_SKILL_BASE_PROBABILITY = {
  normal: 0.20, // Rarity 1
  circle: 0.25, // Rarity 2 (◎)
  gold: 0.40,   // Rarity > 2
};

const ANCESTOR_BONUS = 1.1;
const NUM_BLUE_STATS = 5;
const ASSUMED_A_RANK_APTITUDES = 5; // For Pink Spark calculation

// --- Helper Functions ---

/**
 * Determines the probability of getting a 3-star factor based on a stat value.
 * Source: Global Doc, p.33
 */
const getBlueStarProbability = (statValue: number): number => {
  if (statValue >= 1100) return 0.10;
  if (statValue >= 600) return 0.06;
  return 0;
};

/**
 * Traverses a parent's full lineage to count how many ancestors have a skill from a specific group.
 */
const countAncestorsWithSkill = (
  pair: BreedingPair,
  skillGroupId: number | undefined,
  inventoryMap: Map<number, Parent>,
  skillMapByName: Map<string, Skill>
): number => {
  if (skillGroupId === undefined) return 0;

  const lineage: (Parent | ManualParentData | null)[] = [
    pair.p1,
    pair.p2,
    resolveGrandparent(pair.p1.grandparent1, inventoryMap),
    resolveGrandparent(pair.p1.grandparent2, inventoryMap),
    resolveGrandparent(pair.p2.grandparent1, inventoryMap),
    resolveGrandparent(pair.p2.grandparent2, inventoryMap),
  ];

  let count = 0;
  for (const member of lineage) {
    if (!member) continue;
    const skills = [...member.uniqueSparks, ...member.whiteSparks];
    if (skills.some(s => skillMapByName.get(s.name)?.groupId === skillGroupId)) {
      count++;
    }
  }
  return count;
};


// --- Main Calculation Functions ---

/**
 * Calculates the probability of obtaining a 3-star blue spark that matches one of the primary goal stats.
 */
export const calculateBlueSparkProb = (goal: Goal, targetStats: Record<string, number>): number => {
  let totalProb = 0;
  for (const stat of goal.primaryBlue) {
    const statValue = targetStats[stat.toLowerCase()] || 0;
    const prob3Star = getBlueStarProbability(statValue);
    totalProb += (1 / NUM_BLUE_STATS) * prob3Star;
  }
  return totalProb;
};

/**
 * Calculates the probability of obtaining a 3-star pink spark that matches one of the primary goal aptitudes.
 */
export const calculatePinkSparkProb = (goal: Goal, trainingRank: 'ss' | 'ss+'): number => {
  if (goal.primaryPink.length === 0) return 0;
  
  const probPickPrimary = goal.primaryPink.length / ASSUMED_A_RANK_APTITUDES;
  const prob3Star = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus[3] : STAR_PROBABILITY.standard[3];

  return probPickPrimary * prob3Star;
};

/**
 * Calculates the probability of obtaining a specific 3-star wishlisted white spark.
 */
export const calculateSingleWhiteSparkProb = (
  wishlistItem: WishlistItem,
  pair: BreedingPair,
  trainingRank: 'ss' | 'ss+',
  masterSkillList: Skill[],
  skillMapByName: Map<string, Skill>,
  inventoryMap: Map<number, Parent>
): number => {
  const sourceSkill = skillMapByName.get(wishlistItem.name);
  if (!sourceSkill) return 0;

  // 1. Find the best version of the skill (gold, ◎, or normal)
  const skillFamily = masterSkillList.filter(s => s.groupId && s.groupId === sourceSkill.groupId);
  const bestSkillInFamily = skillFamily.reduce((best, current) => 
    (current.rarity || 0) > (best.rarity || 0) ? current : best, 
    sourceSkill
  );

  // 2. Determine base probability from the best version's rarity
  let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
  if (bestSkillInFamily.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;
  if (bestSkillInFamily.rarity && bestSkillInFamily.rarity > 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.gold;

  // 3. Count ancestors and apply bonus
  const ancestorCount = countAncestorsWithSkill(pair, sourceSkill.groupId, inventoryMap, skillMapByName);
  const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));

  // 4. Apply star probability based on training rank
  const prob3Star = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus[3] : STAR_PROBABILITY.standard[3];

  return acquireProb * prob3Star;
};