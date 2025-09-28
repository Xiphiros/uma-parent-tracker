import { BreedingPair, Goal, Parent, Skill } from '../types';

export type ProbabilityWorkerPayload = {
    pair: BreedingPair;
    p1DisplayName: string;
    p2DisplayName: string;
    calculationMode: 'final' | 'individual';
    goal: Goal;
    targetStats: Record<string, number>;
    trainingRank: 'ss' | 'ss+';
    inventory: Parent[];
    skillMapEntries: [string, Skill][];
    spBudget: number;
    acquirableSkillIds: number[];
    conditionalSkillIds: number[];
    targetAptitudes: string[];
};