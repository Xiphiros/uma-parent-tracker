import { AppData, LegacyImportWorkerPayload, LegacyImportWorkerResponse, ManualParentData, Parent, Skill, Uma, WhiteSpark, UniqueSpark, PinkSpark, BlueSpark, Grandparent } from '../types';

const APP_DATA_VERSION = 10;
const ID_GENERATION_BASE = 1700000000000;

// --- Helper Functions ---

const createFactorMap = (skillList: Skill[]): Map<number, { name: string; stars: 1 | 2 | 3; category: string }> => {
    const factorMap = new Map<number, { name: string; stars: 1 | 2 | 3; category: string }>();
    for (const skill of skillList) {
        for (const rarityInfo of skill.rarities || []) {
            factorMap.set(rarityInfo.factorId, {
                name: skill.name_en,
                stars: rarityInfo.rarity,
                category: skill.category,
            });
        }
    }
    return factorMap;
};

const getUmaDisplayName = (uma: Uma): string => {
    const baseName = uma.base_name_en || uma.base_name_jp;
    const outfitName = uma.outfit_name_en || uma.outfit_name_jp;
    return outfitName ? `${outfitName} ${baseName}` : baseName;
};

const parseFactorArray = (factorIds: number[], factorMap: Map<number, any>): Record<string, any[]> => {
    const sparks: Record<string, any[]> = { blue: [], pink: [], uniqueSparks: [], whiteSparks: [] };
    for (const factorId of factorIds) {
        const sparkData = factorMap.get(factorId);
        if (!sparkData) continue;

        const { category, name, stars } = sparkData;
        const sparkObject = { name, stars };

        if (category === 'blue') sparks.blue.push({ type: name, stars });
        else if (category === 'pink') sparks.pink.push({ type: name, stars });
        else if (category === 'unique') sparks.uniqueSparks.push(sparkObject);
        else if (category === 'white') sparks.whiteSparks.push(sparkObject);
    }
    return sparks;
};

const selectRepresentativeSpark = <T>(sparks: T[]): T | null => {
    if (!sparks || sparks.length === 0) return null;
    return sparks.reduce((max, current) => ((current as any).stars > (max as any).stars ? current : max), sparks[0]);
};

const createManualGrandparent = (parentData: any, factorMap: Map<number, any>): ManualParentData => {
    const sparks = parseFactorArray(parentData.factor_id_array || [], factorMap);
    return {
        umaId: String(parentData.card_id),
        blueSpark: selectRepresentativeSpark<BlueSpark>(sparks.blue) || { type: 'Speed', stars: 1 },
        pinkSpark: selectRepresentativeSpark<PinkSpark>(sparks.pink) || { type: 'Turf', stars: 1 },
        uniqueSparks: sparks.uniqueSparks,
        whiteSparks: sparks.whiteSparks,
    };
};

const processTrainedCharacter = (
    trainedChara: any,
    factorMap: Map<number, any>,
    umaMap: Map<string, Uma>,
    ownedCharasMap: Map<number, any>
): Parent | null => {
    const sparks = parseFactorArray(trainedChara.factor_id_array || [], factorMap);
    const umaIdStr = String(trainedChara.card_id);
    const umaInfo = umaMap.get(umaIdStr);

    if (!umaInfo) {
        console.warn(`Uma with card_id ${umaIdStr} not found. Skipping character.`);
        return null;
    }

    const p1Id = trainedChara.succession_trained_chara_id_1;
    const p2Id = trainedChara.succession_trained_chara_id_2;
    let grandparent1: Grandparent | undefined = undefined;
    let grandparent2: Grandparent | undefined = undefined;

    if (p1Id && ownedCharasMap.has(p1Id)) {
        grandparent1 = p1Id;
    } else {
        const successionParents = new Map((trainedChara.succession_chara_array || []).map((p: any) => [p.position_id, p]));
        const p1Data = successionParents.get(10);
        if (p1Data) grandparent1 = createManualGrandparent(p1Data, factorMap);
    }
    
    if (p2Id && ownedCharasMap.has(p2Id)) {
        grandparent2 = p2Id;
    } else {
        const successionParents = new Map((trainedChara.succession_chara_array || []).map((p: any) => [p.position_id, p]));
        const p2Data = successionParents.get(20);
        if (p2Data) grandparent2 = createManualGrandparent(p2Data, factorMap);
    }

    return {
        umaId: umaIdStr,
        name: getUmaDisplayName(umaInfo),
        blueSpark: selectRepresentativeSpark<BlueSpark>(sparks.blue) || { type: 'Speed', stars: 1 },
        pinkSpark: selectRepresentativeSpark<PinkSpark>(sparks.pink) || { type: 'Turf', stars: 1 },
        uniqueSparks: sparks.uniqueSparks,
        whiteSparks: sparks.whiteSparks,
        grandparent1,
        grandparent2,
        isBorrowed: trainedChara.owner_viewer_id !== 0,
        id: trainedChara.trained_chara_id, // Temporary old ID
        gen: 1,
        score: 0,
        server: 'global',
    };
};

const generateParentHash = (parentData: Parent): string => {
    const sortSparks = (sparks: (WhiteSpark[] | UniqueSpark[])) => [...sparks].sort((a, b) => a.name.localeCompare(b.name));
    
    const serializeGp = (gp?: Grandparent): string => {
        if (!gp) return 'none';
        if (typeof gp === 'number') return `id:${gp}`;
        const unique = sortSparks(gp.uniqueSparks).map(s => `${s.name}|${s.stars}`).join(',');
        const white = sortSparks(gp.whiteSparks).map(s => `${s.name}|${s.stars}`).join(',');
        return `manual:${gp.umaId || 'none'}:${gp.blueSpark.type}|${gp.blueSpark.stars}:${gp.pinkSpark.type}|${gp.pinkSpark.stars}:${unique}:${white}`;
    };

    const components = [
        `uma:${parentData.umaId}`,
        `blue:${parentData.blueSpark.type}|${parentData.blueSpark.stars}`,
        `pink:${parentData.pinkSpark.type}|${parentData.pinkSpark.stars}`,
        `unique:${sortSparks(parentData.uniqueSparks).map(s => `${s.name}|${s.stars}`).join(',')}`,
        `white:${sortSparks(parentData.whiteSparks).map(s => `${s.name}|${s.stars}`).join(',')}`,
        `gp1:${serializeGp(parentData.grandparent1)}`,
        `gp2:${serializeGp(parentData.grandparent2)}`,
        `borrowed:${!!parentData.isBorrowed}`
    ];
    return components.join(';');
};

const createImportFileStructure = (inventory: Parent[]): AppData => {
    const profileId = ID_GENERATION_BASE - 1;
    const newProfile = {
        id: profileId,
        name: "Imported Parents",
        goal: { primaryBlue: [], secondaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] },
        roster: inventory.filter(p => !p.isBorrowed).map(p => p.id),
        isPinned: false,
    };

    return {
        version: APP_DATA_VERSION,
        activeServer: 'global',
        inventory,
        skillPresets: [],
        serverData: {
            jp: { activeProfileId: null, profiles: [], folders: [], layout: [] },
            global: { activeProfileId: profileId, profiles: [newProfile], folders: [], layout: [profileId] }
        }
    };
};

// --- Main Worker Logic ---
self.onmessage = (e: MessageEvent<LegacyImportWorkerPayload>) => {
    try {
        const { legacyData, skillList, umaList } = e.data;
        
        const factorMap = createFactorMap(skillList);
        const umaMap = new Map(umaList.map(u => [u.id, u]));
        const trainedCharacters = (legacyData?.data?.trained_chara_array || []).sort((a: any, b: any) => a.trained_chara_id - b.trained_chara_id);
        const ownedCharasMap = new Map(trainedCharacters.map((c: any) => [c.trained_chara_id, c]));

        const processedParents = trainedCharacters
            .map((chara: any) => processTrainedCharacter(chara, factorMap, umaMap, ownedCharasMap))
            .filter((p): p is Parent => p !== null);

        const oldIdToNewIdMap = new Map<number, number>();
        processedParents.forEach((parent, i) => {
            const oldId = parent.id;
            const newId = ID_GENERATION_BASE + i;
            oldIdToNewIdMap.set(oldId, newId);
            parent.id = newId;
        });

        const finalInventory = processedParents.map(parent => {
            const normalized = { ...parent };
            if (typeof normalized.grandparent1 === 'number' && oldIdToNewIdMap.has(normalized.grandparent1)) {
                normalized.grandparent1 = oldIdToNewIdMap.get(normalized.grandparent1);
            }
            if (typeof normalized.grandparent2 === 'number' && oldIdToNewIdMap.has(normalized.grandparent2)) {
                normalized.grandparent2 = oldIdToNewIdMap.get(normalized.grandparent2);
            }
            normalized.hash = generateParentHash(normalized);
            return normalized;
        });

        const finalData = createImportFileStructure(finalInventory);
        
        const response: LegacyImportWorkerResponse = { type: 'success', data: finalData };
        self.postMessage(response);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred during legacy import.';
        const response: LegacyImportWorkerResponse = { type: 'error', message };
        self.postMessage(response);
    }
};