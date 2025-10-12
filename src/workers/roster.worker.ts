import { 
    RosterWorkerPayload, Parent, Skill, Uma, Goal, SortFieldType, 
    SortDirectionType, InventoryViewType, LineageStats, Grandparent, ManualParentData,
    WhiteSpark, UniqueSpark, BreedingPairWithStats
} from '../types';

// --- STATE ---
let inventory: Parent[] = [];
let skillMapByName: Map<string, Skill> = new Map();
let umaMapById: Map<string, Uma> = new Map();
let activeServer: 'jp' | 'global' = 'jp';

const TOP_K = 20;

// --- UTILITY FUNCTIONS (Self-contained for worker context) ---

/**
 * Assembles a display name for a Uma based on its base name and outfit name.
 */
const getUmaDisplayName = (uma: Uma): string => {
    const baseName = uma.base_name_en || uma.base_name_jp;
    const outfitName = uma.outfit_name_en || uma.outfit_name_jp;
    if (outfitName) {
        return `${outfitName} ${baseName}`;
    }
    return baseName;
};

/**
 * Resolves a grandparent reference to its full data object.
 */
function resolveGrandparent(gp: Grandparent | undefined, inventoryMap: Map<number, Parent>): Parent | ManualParentData | null {
    if (!gp) return null;
    if (typeof gp === 'number') return inventoryMap.get(gp) || null;
    return gp;
}

/**
 * Aggregates all spark data from a parent and its two grandparents.
 */
function getLineageStats(parent: Parent, inventoryMap: Map<number, Parent>): LineageStats {
    const stats: LineageStats = { blue: {}, pink: {}, unique: {}, white: {}, whiteSkillCount: 0 };
    const members = [
        parent,
        resolveGrandparent(parent.grandparent1, inventoryMap),
        resolveGrandparent(parent.grandparent2, inventoryMap)
    ];
    const allWhiteSparks = new Set<string>();
    for (const member of members) {
        if (!member) continue;
        stats.blue[member.blueSpark.type] = (stats.blue[member.blueSpark.type] || 0) + member.blueSpark.stars;
        stats.pink[member.pinkSpark.type] = (stats.pink[member.pinkSpark.type] || 0) + member.pinkSpark.stars;
        member.uniqueSparks.forEach((s: UniqueSpark) => {
            stats.unique[s.name] = (stats.unique[s.name] || 0) + s.stars;
        });
        if ('whiteSparks' in member) {
            member.whiteSparks.forEach((s: WhiteSpark) => {
                stats.white[s.name] = (stats.white[s.name] || 0) + s.stars;
                allWhiteSparks.add(s.name);
            });
        }
    }
    stats.whiteSkillCount = allWhiteSparks.size;
    return stats;
}

/**
 * Counts the total number of inheritable white sparks in a single parent's lineage.
 */
function countTotalLineageWhiteSparks(parent: Parent, inventoryMap: Map<number, Parent>): number {
    let total = 0;
    const lineage = [parent, resolveGrandparent(parent.grandparent1, inventoryMap), resolveGrandparent(parent.grandparent2, inventoryMap)];
    for (const member of lineage) {
        if (member && 'whiteSparks' in member) total += member.whiteSparks.length;
    }
    return total;
}

/**
 * Counts the number of unique inheritable white sparks from a combined lineage.
 */
function countUniqueCombinedLineageWhiteSparks(p1: Parent, p2: Parent, inventoryMap: Map<number, Parent>): number {
    const skillNames = new Set<string>();
    const lineage = [p1, p2, resolveGrandparent(p1.grandparent1, inventoryMap), resolveGrandparent(p1.grandparent2, inventoryMap), resolveGrandparent(p2.grandparent1, inventoryMap), resolveGrandparent(p2.grandparent2, inventoryMap)];
    for (const member of lineage) {
        if (member && 'whiteSparks' in member) member.whiteSparks.forEach(s => skillNames.add(s.name));
    }
    return skillNames.size;
}

// --- SCORING LOGIC (Self-contained for worker context) ---
const BASE_SCORES = { blue: { 1: 8, 2: 15, 3: 30 }, pink: { 1: 10, 2: 17, 3: 30 } };
const UTILITY_SCORES = { unique: { 1: 7, 2: 14, 3: 21 }, white: { 1: 7, 2: 14, 3: 21 } };

function getBlueMultiplier(type: string, goal: Goal): number {
    if (goal.primaryBlue.includes(type)) return 1.5;
    if (goal.secondaryBlue.includes(type)) return 1.2;
    return 0.5;
}

function getPinkMultiplier(type: string, goal: Goal): number {
    return goal.primaryPink.includes(type) ? 1.5 : 0.5;
}

function getWishlistMultiplier(tier: 'S' | 'A' | 'B' | 'C' | 'OTHER'): number {
    switch (tier) { case 'S': return 2.0; case 'A': return 1.5; case 'B': return 1.2; case 'C': return 1.0; default: return 1.0; }
}

function calculateDynamicSparkBaseScore(spark: WhiteSpark | UniqueSpark): number {
    const pAcquire = 0.20; // Simplified base probability
    const pStar = { 1: 0.50, 2: 0.45, 3: 0.05 }[spark.stars];
    const finalProbability = pAcquire * pStar;
    if (finalProbability === 0) return 0;
    const rarityScore = Math.round(Math.sqrt(1 / finalProbability));
    const utilityScore = (spark as UniqueSpark).name ? UTILITY_SCORES.unique[spark.stars] : UTILITY_SCORES.white[spark.stars];
    return rarityScore + utilityScore;
}

function calculateIndividualScore(entity: Parent | ManualParentData, goal: Goal, inventoryMap: Map<number, Parent>): number {
    let baseTotalScore = 0;
    baseTotalScore += BASE_SCORES.blue[entity.blueSpark.stars] * getBlueMultiplier(entity.blueSpark.type, goal);
    baseTotalScore += BASE_SCORES.pink[entity.pinkSpark.stars] * getPinkMultiplier(entity.pinkSpark.type, goal);

    if ('whiteSparks' in entity) {
        entity.whiteSparks.forEach((spark: WhiteSpark) => {
            const baseScore = calculateDynamicSparkBaseScore(spark);
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            baseTotalScore += baseScore * getWishlistMultiplier(wishlistItem?.tier || 'OTHER');
        });
    }

    entity.uniqueSparks.forEach((spark: UniqueSpark) => {
        const wishlistItem = goal.uniqueWishlist.find(w => w.name === spark.name);
        baseTotalScore += calculateDynamicSparkBaseScore(spark) * getWishlistMultiplier(wishlistItem?.tier || 'OTHER');
    });

    const whiteSparkCount = 'whiteSparks' in entity ? entity.whiteSparks.length : 0;
    return baseTotalScore * (1 + (whiteSparkCount * 0.01));
}

function calculateScore(parent: Parent, goal: Goal, inventoryMap: Map<number, Parent>): number {
    const parentScore = calculateIndividualScore(parent, goal, inventoryMap);
    const gp1 = resolveGrandparent(parent.grandparent1, inventoryMap);
    const gp2 = resolveGrandparent(parent.grandparent2, inventoryMap);
    const gp1Score = gp1 ? calculateIndividualScore(gp1, goal, inventoryMap) : 0;
    const gp2Score = gp2 ? calculateIndividualScore(gp2, goal, inventoryMap) : 0;
    return Math.round(parentScore + (gp1Score * 0.5) + (gp2Score * 0.5));
}

// --- MAIN WORKER LOGIC ---

self.onmessage = (e: MessageEvent<RosterWorkerPayload>) => {
    const { type, data } = e.data;

    if (type === 'INIT') {
        inventory = data.inventory;
        skillMapByName = new Map(data.skillMapEntries);
        umaMapById = new Map(data.umaMapEntries);
        activeServer = data.activeServer;
        return;
    }

    if (type === 'UPDATE') {
        const { goal, filters, sortField, sortDirection, inventoryView } = data;
        const inventoryMap = new Map(inventory.map(p => [p.id, p]));

        // 1. Filter inventory
        let viewFiltered = inventory.filter(p => p.server === activeServer);
        if (inventoryView === 'owned') viewFiltered = viewFiltered.filter(p => !p.isBorrowed);
        if (inventoryView === 'borrowed') viewFiltered = viewFiltered.filter(p => p.isBorrowed);

        const lineageStatsCache = new Map<number, LineageStats>();
        const getCachedLineageStats = (p: Parent) => {
            if (!lineageStatsCache.has(p.id)) lineageStatsCache.set(p.id, getLineageStats(p, inventoryMap));
            return lineageStatsCache.get(p.id)!;
        };

        const searchFiltered = viewFiltered.filter(parent => {
            const uma = umaMapById.get(parent.umaId);
            if (filters.searchTerm && !getUmaDisplayName(uma!).toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
            
            const lineageStats = getCachedLineageStats(parent);
            if (filters.minWhiteSparks > 0 && lineageStats.whiteSkillCount < filters.minWhiteSparks) return false;

            const scope = filters.searchScope;
            if (!filters.blueSparks.every(f => (scope === 'total' ? (lineageStats.blue[f.type] || 0) : parent.blueSpark.type === f.type ? parent.blueSpark.stars : 0) >= f.stars)) return false;
            if (!filters.pinkSparks.every(f => (scope === 'total' ? (lineageStats.pink[f.type] || 0) : parent.pinkSpark.type === f.type ? parent.pinkSpark.stars : 0) >= f.stars)) return false;
            if (!filters.uniqueSparks.every(f => !f.name || (scope === 'total' ? (lineageStats.unique[f.name] || 0) : parent.uniqueSparks.find(s => s.name === f.name)?.stars || 0) >= f.stars)) return false;
            if (!filters.whiteSparks.every(f => !f.name || (scope === 'total' ? (lineageStats.white[f.name] || 0) : parent.whiteSparks.find(s => s.name === f.name)?.stars || 0) >= f.stars)) return false;
            
            return true;
        });

        // 2. Score and Sort
        const scoredAndSorted = searchFiltered.map(p => ({
            ...p,
            score: calculateScore(p, goal, inventoryMap),
            individualScore: Math.round(calculateIndividualScore(p, goal, inventoryMap))
        })).sort((a, b) => {
            let comp = 0;
            switch (sortField) {
                case 'name': comp = a.name.localeCompare(b.name); break;
                case 'gen': comp = b.gen - a.gen; break;
                case 'id': comp = b.id - a.id; break;
                case 'sparks': comp = countTotalLineageWhiteSparks(b, inventoryMap) - countTotalLineageWhiteSparks(a, inventoryMap); break;
                case 'individualScore': comp = b.individualScore - a.individualScore; break;
                default: comp = b.score - a.score; break;
            }
            return sortDirection === 'desc' ? comp : -comp;
        });

        // 3. Calculate Top Pairs
        const rosterForPairing = scoredAndSorted.filter(p => !p.isBorrowed);
        const topOwnedPairs: BreedingPairWithStats[] = [];
        const topBorrowedPairs: BreedingPairWithStats[] = [];

        const comparePairs = (a: BreedingPairWithStats, b: BreedingPairWithStats) => {
            const scoreField = sortField === 'individualScore' ? 'avgIndividualScore' : 'avgFinalScore';
            if (b[scoreField] !== a[scoreField]) return b[scoreField] - a[scoreField];
            return b.totalSparks - a.totalSparks;
        };

        // Owned x Owned
        for (let i = 0; i < rosterForPairing.length; i++) {
            for (let j = i + 1; j < rosterForPairing.length; j++) {
                const p1 = rosterForPairing[i];
                const p2 = rosterForPairing[j];
                const p1CharId = umaMapById.get(p1.umaId)?.characterId;
                const p2CharId = umaMapById.get(p2.umaId)?.characterId;
                if (p1CharId === p2CharId) continue;

                const newPair = { p1, p2, avgFinalScore: (p1.score + p2.score) / 2, avgIndividualScore: (p1.individualScore + p2.individualScore) / 2, totalSparks: countTotalLineageWhiteSparks(p1, inventoryMap) + countTotalLineageWhiteSparks(p2, inventoryMap), uniqueSparks: countUniqueCombinedLineageWhiteSparks(p1, p2, inventoryMap) };
                if (topOwnedPairs.length < TOP_K) {
                    topOwnedPairs.push(newPair);
                    topOwnedPairs.sort(comparePairs);
                } else if (comparePairs(newPair, topOwnedPairs[TOP_K - 1]) < 0) {
                    topOwnedPairs[TOP_K - 1] = newPair;
                    topOwnedPairs.sort(comparePairs);
                }
            }
        }
        
        // Owned x Borrowed
        const borrowedParents = inventory.filter(p => p.isBorrowed && p.server === activeServer).map(p => ({...p, score: calculateScore(p, goal, inventoryMap), individualScore: Math.round(calculateIndividualScore(p, goal, inventoryMap)) }));
        for (const p1 of rosterForPairing) {
            for (const p2 of borrowedParents) {
                const p1CharId = umaMapById.get(p1.umaId)?.characterId;
                const p2CharId = umaMapById.get(p2.umaId)?.characterId;
                if (p1CharId === p2CharId) continue;

                const newPair = { p1, p2, avgFinalScore: (p1.score + p2.score) / 2, avgIndividualScore: (p1.individualScore + p2.individualScore) / 2, totalSparks: countTotalLineageWhiteSparks(p1, inventoryMap) + countTotalLineageWhiteSparks(p2, inventoryMap), uniqueSparks: countUniqueCombinedLineageWhiteSparks(p1, p2, inventoryMap) };
                 if (topBorrowedPairs.length < TOP_K) {
                    topBorrowedPairs.push(newPair);
                    topBorrowedPairs.sort(comparePairs);
                } else if (comparePairs(newPair, topBorrowedPairs[TOP_K - 1]) < 0) {
                    topBorrowedPairs[TOP_K - 1] = newPair;
                    topBorrowedPairs.sort(comparePairs);
                }
            }
        }

        // 4. Post Results
        self.postMessage({
            sortedParentIds: scoredAndSorted.map(p => p.id),
            topBreedingPairs: {
                owned: topOwnedPairs,
                borrowed: topBorrowedPairs,
            }
        });
    }
};