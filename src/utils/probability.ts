import { BreedingPair, Goal, ManualParentData, Parent, Skill, WishlistItem } from '../types';
import { resolveGrandparent } from './affinity';

// -- CONSTANTS --

const STAR_PROBABILITY = {
  standard: { 1: 0.50, 2: 0.45, 3: 0.05 },
  ssPlus: { 1: 0.20, 2: 0.70, 3: 0.10 },
};

const BLUE_STAR_PROBABILITY = {
    high: { 1: 0.40, 2: 0.50, 3: 0.10 }, // 1100+ stats
    mid: { 1: 0.44, 2: 0.50, 3: 0.06 },  // 600-1099 stats
    low: { 1: 0.50, 2: 0.50, 3: 0.00 },   // <600 stats
};

const WHITE_SKILL_BASE_PROBABILITY = {
  normal: 0.20,
  circle: 0.25,
  gold: 0.40,
};

const ANCESTOR_BONUS = 1.1;
const NUM_BLUE_STATS = 5;
const ASSUMED_A_RANK_APTITUDES = 5;

// -- HELPERS --

const getBlueStarDistributionForStat = (statValue: number) => {
    if (statValue >= 1100) return BLUE_STAR_PROBABILITY.high;
    if (statValue >= 600) return BLUE_STAR_PROBABILITY.mid;
    return BLUE_STAR_PROBABILITY.low;
};

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


// -- MAIN CALCULATION FUNCTIONS --

export const calculateBlueSparkProb = (goal: Goal, targetStats: Record<string, number>): number => {
  let totalProb = 0;
  for (const stat of goal.primaryBlue) {
    const statValue = targetStats[stat.toLowerCase()] || 0;
    const prob3Star = getBlueStarDistributionForStat(statValue)[3];
    totalProb += (1 / NUM_BLUE_STATS) * prob3Star;
  }
  return totalProb;
};

export const calculatePinkSparkProb = (goal: Goal, trainingRank: 'ss' | 'ss+'): number => {
  if (goal.primaryPink.length === 0) return 0;
  
  const probPickPrimary = goal.primaryPink.length / ASSUMED_A_RANK_APTITUDES;
  const prob3Star = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus[3] : STAR_PROBABILITY.standard[3];

  return probPickPrimary * prob3Star;
};

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

  const skillFamily = masterSkillList.filter(s => s.groupId && s.groupId === sourceSkill.groupId);
  const bestSkillInFamily = skillFamily.reduce((best, current) => 
    (current.rarity || 0) > (best.rarity || 0) ? current : best, 
    sourceSkill
  );

  let baseProb = WHITE_SKILL_BASE_PROBABILITY.normal;
  if (bestSkillInFamily.rarity === 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.circle;
  if (bestSkillInFamily.rarity && bestSkillInFamily.rarity > 2) baseProb = WHITE_SKILL_BASE_PROBABILITY.gold;

  const ancestorCount = countAncestorsWithSkill(pair, sourceSkill.groupId, inventoryMap, skillMapByName);
  const acquireProb = Math.min(1.0, baseProb * (ANCESTOR_BONUS ** ancestorCount));

  const prob3Star = trainingRank === 'ss+' ? STAR_PROBABILITY.ssPlus[3] : STAR_PROBABILITY.standard[3];

  return acquireProb * prob3Star;
};