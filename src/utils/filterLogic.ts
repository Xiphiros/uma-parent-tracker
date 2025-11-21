import { Parent, Filters, ManualParentData, FilterCategory } from '../types';
import { getLineageStats, resolveGrandparent } from './affinity';

/**
 * Checks if a specific white spark exists on a parent or manual grandparent.
 */
const hasWhiteSpark = (entity: Parent | ManualParentData | null, skillName: string): boolean => {
    if (!entity || !('whiteSparks' in entity)) return false;
    return entity.whiteSparks.some(s => s.name === skillName);
};

/**
 * Checks if a specific unique spark exists on a parent or manual grandparent.
 */
const hasUniqueSpark = (entity: Parent | ManualParentData | null, skillName: string): boolean => {
    if (!entity) return false;
    return entity.uniqueSparks.some(s => s.name === skillName);
};

/**
 * Checks if a white spark is present in the entire lineage (Parent + GP1 + GP2).
 * This corresponds to the "Lineage-Wide Spark" filter.
 */
const checkLineageSpark = (parent: Parent, skillName: string, inventoryMap: Map<number, Parent>): boolean => {
    if (!skillName) return true; // Empty condition passes

    const gp1 = resolveGrandparent(parent.grandparent1, inventoryMap);
    const gp2 = resolveGrandparent(parent.grandparent2, inventoryMap);

    return hasWhiteSpark(parent, skillName) && hasWhiteSpark(gp1, skillName) && hasWhiteSpark(gp2, skillName);
};

/**
 * Evaluates a single filter condition against a parent.
 */
const evaluateCondition = (
    condition: { category: FilterCategory; value: string; stars: number },
    parent: Parent,
    lineageStats: ReturnType<typeof getLineageStats>,
    inventoryMap: Map<number, Parent>,
    scope: 'total' | 'representative'
): boolean => {
    const isTotal = scope === 'total';

    switch (condition.category) {
        case 'blue':
            if (isTotal) {
                return (lineageStats.blue[condition.value] || 0) >= condition.stars;
            } else {
                return parent.blueSpark.type === condition.value && parent.blueSpark.stars >= condition.stars;
            }
        case 'pink':
            if (isTotal) {
                return (lineageStats.pink[condition.value] || 0) >= condition.stars;
            } else {
                return parent.pinkSpark.type === condition.value && parent.pinkSpark.stars >= condition.stars;
            }
        case 'unique':
            if (!condition.value) return true;
            if (isTotal) {
                return (lineageStats.unique[condition.value] || 0) >= condition.stars;
            } else {
                const spark = parent.uniqueSparks.find(s => s.name === condition.value);
                return (spark?.stars || 0) >= condition.stars;
            }
        case 'white':
            if (!condition.value) return true;
            if (isTotal) {
                return (lineageStats.white[condition.value] || 0) >= condition.stars;
            } else {
                const spark = parent.whiteSparks.find(s => s.name === condition.value);
                return (spark?.stars || 0) >= condition.stars;
            }
        case 'lineage':
            return checkLineageSpark(parent, condition.value, inventoryMap);
        default:
            return false;
    }
};

/**
 * The main filtering function used by both the Worker and the UI.
 * 
 * @param parent The parent object to check.
 * @param displayName The resolved display name of the parent (for search term checking).
 * @param filters The filter configuration.
 * @param inventoryMap Map of all parents for resolving grandparents.
 * @param cachedLineageStats Optional pre-calculated lineage stats for performance.
 */
export const checkParent = (
    parent: Parent,
    displayName: string,
    filters: Filters,
    inventoryMap: Map<number, Parent>,
    cachedLineageStats?: ReturnType<typeof getLineageStats>
): boolean => {
    // 1. Search Term
    if (filters.searchTerm && !displayName.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
    }

    // Get Stats (use cache if provided, otherwise calculate)
    const lineageStats = cachedLineageStats || getLineageStats(parent, inventoryMap);

    // 2. Min White Sparks
    if (filters.minWhiteSparks > 0 && lineageStats.whiteSkillCount < filters.minWhiteSparks) {
        return false;
    }

    // 3. Condition Groups (AND logic between groups)
    // If no groups exist, this loop is skipped and we return true (pass).
    for (const group of filters.conditionGroups) {
        // Inside Group (OR logic between conditions)
        // A group passes if ANY condition inside it evaluates to true.
        const groupPasses = group.some(condition => 
            evaluateCondition(condition, parent, lineageStats, inventoryMap, filters.searchScope)
        );

        if (!groupPasses) {
            return false; // AND failed
        }
    }

    return true;
};