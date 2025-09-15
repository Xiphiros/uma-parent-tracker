import { Grandparent, ManualParentData, Parent, Uma } from '../types';

type GetExcludedIdsConfig = {
    umaMapById: Map<string, Uma>;
    inventory: Parent[];
} & ({
    context: 'planner';
    activeSlot: 'parent1' | 'parent2' | null;
    parent1: Parent | null;
    parent2: Parent | null;
} | {
    context: 'grandparent';
    activeGpSlot: 'grandparent1' | 'grandparent2' | null;
    parentToEdit: Parent | null;
    grandparent1?: Grandparent;
    grandparent2?: Grandparent;
});

const getCharacterIdFromGrandparent = (
    gp: Grandparent | undefined,
    umaMapById: Map<string, Uma>,
    inventory: Parent[]
): string | undefined => {
    if (!gp) return undefined;

    let umaId: string | undefined;
    if (typeof gp === 'number') {
        umaId = inventory.find(p => p.id === gp)?.umaId;
    } else {
        umaId = (gp as ManualParentData).umaId;
    }

    return umaId ? umaMapById.get(umaId)?.characterId : undefined;
};

export const getExcludedCharacterIds = (config: GetExcludedIdsConfig): Set<string> => {
    const excluded = new Set<string>();
    const { umaMapById, inventory } = config;

    if (config.context === 'planner') {
        const { activeSlot, parent1, parent2 } = config;
        let parentToCheck: Parent | null = null;

        if (activeSlot === 'parent1') parentToCheck = parent2;
        if (activeSlot === 'parent2') parentToCheck = parent1;

        if (parentToCheck) {
            const charId = umaMapById.get(parentToCheck.umaId)?.characterId;
            if (charId) excluded.add(charId);
        }
    }

    if (config.context === 'grandparent') {
        const { activeGpSlot, parentToEdit, grandparent1, grandparent2 } = config;

        // Exclude the parent being edited
        if (parentToEdit) {
            const charId = umaMapById.get(parentToEdit.umaId)?.characterId;
            if (charId) excluded.add(charId);
        }

        // Exclude the other grandparent
        const otherGp = activeGpSlot === 'grandparent1' ? grandparent2 : grandparent1;
        const otherGpCharId = getCharacterIdFromGrandparent(otherGp, umaMapById, inventory);
        if (otherGpCharId) {
            excluded.add(otherGpCharId);
        }
    }

    return excluded;
};