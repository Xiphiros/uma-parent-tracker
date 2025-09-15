import { Grandparent, ManualParentData, Parent, Uma } from '../types';

/**
 * Resolves a grandparent reference (ID or object) to a full data object.
 * @param gp The grandparent reference.
 * @param inventoryMap A map of all parents in the inventory, keyed by ID.
 * @returns A Parent or ManualParentData object, or null if not found.
 */
export function resolveGrandparent(gp: Grandparent | undefined, inventoryMap: Map<number, Parent>): Parent | ManualParentData | null {
    if (!gp) return null;
    if (typeof gp === 'number') return inventoryMap.get(gp) || null;
    return gp;
}

/**
 * Gets the base character ID from various data types (Parent, Uma, ManualParentData).
 * @param item The item to get the character ID from.
 * @param umaMapById A map of all uma data, keyed by outfit ID.
 * @returns The base character ID as a number, or null.
 */
function getCharacterId(item: Parent | Uma | ManualParentData | null, umaMapById: Map<string, Uma>): number | null {
    if (!item) return null;
    let umaId: string | undefined;

    if ('umaId' in item) { // Parent or ManualParentData
        umaId = item.umaId;
    } else if ('characterId' in item) { // Uma
        return parseInt(item.characterId, 10);
    }

    if (umaId) {
        const charId = umaMapById.get(umaId)?.characterId;
        return charId ? parseInt(charId, 10) : null;
    }
    return null;
}

/**
 * Internal function to calculate affinity score based on shared relationship groups.
 * @param charIds A list of character IDs to compare.
 * @param charaRelations Map of character IDs to their set of relation group IDs.
 * @param relationPoints Map of relation group IDs to their point values.
 * @returns The calculated affinity score.
 */
function _calculateAffinityScore(
    charIds: (number | null)[],
    charaRelations: Map<number, Set<number>>,
    relationPoints: Map<number, number>
): number {
    const validIds = charIds.filter((id): id is number => id !== null && charaRelations.has(id));

    if (validIds.length < 2) {
        return 0;
    }

    const relationSets = validIds.map(id => charaRelations.get(id)!);

    // Find the intersection of all sets
    const commonRelations = relationSets.reduce((s1, s2) => new Set([...s1].filter(x => s2.has(x))));

    // Sum the points for the common relations
    let score = 0;
    for (const relId of commonRelations) {
        score += relationPoints.get(relId) || 0;
    }
    return score;
}


/**
 * Calculates the full affinity score including a trainee, two parents, and all four grandparents.
 * @returns The total affinity score.
 */
export function calculateFullAffinity(
    trainee: Uma,
    parent1: Parent,
    parent2: Parent,
    charaRelations: Map<number, Set<number>>,
    relationPoints: Map<number, number>,
    inventoryMap: Map<number, Parent>,
    umaMapById: Map<string, Uma>
): number {
    const traineeCharId = getCharacterId(trainee, umaMapById);
    const p1CharId = getCharacterId(parent1, umaMapById);
    const p2CharId = getCharacterId(parent2, umaMapById);
    const p1gp1CharId = getCharacterId(resolveGrandparent(parent1.grandparent1, inventoryMap), umaMapById);
    const p1gp2CharId = getCharacterId(resolveGrandparent(parent1.grandparent2, inventoryMap), umaMapById);
    const p2gp1CharId = getCharacterId(resolveGrandparent(parent2.grandparent1, inventoryMap), umaMapById);
    const p2gp2CharId = getCharacterId(resolveGrandparent(parent2.grandparent2, inventoryMap), umaMapById);

    // 2-Way Affinities
    const trainee_p1 = _calculateAffinityScore([traineeCharId, p1CharId], charaRelations, relationPoints);
    const trainee_p2 = _calculateAffinityScore([traineeCharId, p2CharId], charaRelations, relationPoints);
    const p1_p2 = _calculateAffinityScore([p1CharId, p2CharId], charaRelations, relationPoints);

    // 3-Way Grandparent Affinities
    const trainee_p1_gp1 = _calculateAffinityScore([traineeCharId, p1CharId, p1gp1CharId], charaRelations, relationPoints);
    const trainee_p1_gp2 = _calculateAffinityScore([traineeCharId, p1CharId, p1gp2CharId], charaRelations, relationPoints);
    const trainee_p2_gp1 = _calculateAffinityScore([traineeCharId, p2CharId, p2gp1CharId], charaRelations, relationPoints);
    const trainee_p2_gp2 = _calculateAffinityScore([traineeCharId, p2CharId, p2gp2CharId], charaRelations, relationPoints);

    return trainee_p1 + trainee_p2 + p1_p2 + trainee_p1_gp1 + trainee_p1_gp2 + trainee_p2_gp1 + trainee_p2_gp2;
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
): Set<number> {
    const lineageIds = new Set<number>();
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