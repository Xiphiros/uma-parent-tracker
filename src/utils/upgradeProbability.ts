import { BreedingPair, Goal, Parent, Skill } from '../types';

export type ProbabilityWorkerPayload = {
    pair: BreedingPair;
    goal: Goal;
    targetStats: Record<string, number>;
    trainingRank: 'ss' | 'ss+';
    inventory: Parent[];
    skillMapEntries: [string, Skill][];
    spBudget: number;
};