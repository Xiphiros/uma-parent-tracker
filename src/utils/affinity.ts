import { Grandparent, ManualParentData, Parent, Uma } from '../types';

type AffinityData = Record<string, Record<string, number>>;

/**
 * Resolves a grandparent reference (ID or object) to a full data object.
 * @param gp The grandparent reference.
 * @param inventoryMap A map of all parents in the inventory, keyed by ID.
 * @returns A Parent or ManualParentData object, or null if not found.
 */
function resolveGrandparent(gp: Grandparent | undefined, inventoryMap: Map<number, Parent>): Parent | ManualParentData | null {
    if (!gp) return null;
    if (typeof gp === 'number') return inventoryMap.get(gp) || null;
    return gp;
}

/**
 * Gets the base character ID from various data types (Parent, Uma, ManualParentData).
 * @param item The item to get the character ID from.
 * @param umaMapById A map of all uma data, keyed by outfit ID.
 * @returns The base character ID string, or null.
 */
function getCharacterId(item: Parent | Uma | ManualParentData | null, umaMapById: Map<string, Uma>): string | null {
    if (!item) return null;
    let umaId: string | undefined;

    if ('umaId' in item) { // Parent or ManualParentData
        umaId = item.umaId;
    } else if ('characterId' in item) { // Uma
        return item.characterId;
    }

    if (umaId) {
        return umaMapById.get(umaId)?.characterId || null;
    }
    return null;
}

/**
 * Calculates the full affinity score including a trainee, two parents, and all four grandparents.
 * @returns The total affinity score.
 */
export function calculateFullAffinity(
    trainee: Uma,
    parent1: Parent,
    parent2: Parent,
    affinityData: AffinityData,
    inventoryMap: Map<number, Parent>,
    umaMapById: Map<string, Uma>
): number {
    const traineeCharId = getCharacterId(trainee, umaMapById);
    const p1CharId = getCharacterId(parent1, umaMapById);
    const p2CharId = getCharacterId(parent2, umaMapById);

    if (!traineeCharId || !p1CharId || !p2CharId) return 0;
    
    const affinity = (id1: string, id2: string) => affinityData[id1]?.[id2] ?? 0;

    // Base affinities
    let totalScore = affinity(traineeCharId, p1CharId) + affinity(traineeCharId, p2CharId) + affinity(p1CharId, p2CharId);
    
    // Grandparent affinities
    const grandparents = [
        resolveGrandparent(parent1.grandparent1, inventoryMap),
        resolveGrandparent(parent1.grandparent2, inventoryMap),
        resolveGrandparent(parent2.grandparent1, inventoryMap),
        resolveGrandparent(parent2.grandparent2, inventoryMap)
    ];

    for (const gp of grandparents) {
        const gpCharId = getCharacterId(gp, umaMapById);
        if (gpCharId) {
            totalScore += affinity(traineeCharId, gpCharId);
        }
    }

    return totalScore;
}


/**
 * Gathers all unique character IDs from a given lineage of two parents.
 * @returns A Set containing all unique character IDs.
 */
export function getLineageCharacterIds(
    parent1: Parent,
    parent2: Parent,
    inventoryMap: Map<number, Parent>,
    umaMapById: Map<string, Uma>
): Set<string> {
    const lineageIds = new Set<string>();
    const lineage = [
        parent1,
        parent2,
        resolveGrandparent(parent1.grandparent1, inventoryMap),
        resolveGrandparent(parent1.grandparent2, inventoryMap),
        resolveGrandparent(parent2.grandparent1, inventoryMap),
        resolveGrandparent(parent2.grandparent2, inventoryMap),
    ];

    for (const member of lineage) {
        const charId = getCharacterId(member, umaMapById);
        if (charId) {
            lineageIds.add(charId);
        }
    }

    return lineageIds;
}

/**
 * Counts all unique inheritable skills from a full lineage of two parents and their grandparents.
 * @returns The total number of unique skills.
 */
export function countUniqueInheritableSkills(
    parent1: Parent,
    parent2: Parent,
    inventoryMap: Map<number, Parent>
): number {
    const skillNames = new Set<string>();
    const lineage: (Parent | ManualParentData | null)[] = [
        parent1,
        parent2,
        resolveGrandparent(parent1.grandparent1, inventoryMap),
        resolveGrandparent(parent1.grandparent2, inventoryMap),
        resolveGrandparent(parent2.grandparent1, inventoryMap),
        resolveGrandparent(parent2.grandparent2, inventoryMap),
    ];

    for (const member of lineage) {
        if (!member) continue;
        member.uniqueSparks.forEach(s => skillNames.add(s.name));
        if ('whiteSparks' in member) { // ManualParentData might not have whiteSparks
            member.whiteSparks.forEach(s => skillNames.add(s.name));
        }
    }
    
    return skillNames.size;
}