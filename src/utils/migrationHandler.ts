import i18n from '../i18n';
import { AppData, Folder, Parent, Profile, ServerSpecificData, Uma } from '../types';
import { generateParentHash } from './hashing';
import masterUmaListJson from '../data/uma-list.json';

export const CURRENT_VERSION = 10;

// --- Default State Creation ---

export const createNewProfile = (name: string): Profile => ({
  id: Date.now(),
  name,
  goal: {
    primaryBlue: [],
    secondaryBlue: [],
    primaryPink: [],
    uniqueWishlist: [],
    wishlist: []
  },
  roster: [],
  isPinned: false,
});

const createDefaultServerData = (): ServerSpecificData => {
    const firstProfile = createNewProfile(i18n.t('app:newProjectName'));
    return {
        activeProfileId: firstProfile.id,
        profiles: [firstProfile],
        folders: [],
        layout: [firstProfile.id],
    };
};

export const createDefaultState = (): AppData => {
    return {
        version: CURRENT_VERSION,
        activeServer: 'jp',
        inventory: [],
        skillPresets: [],
        serverData: {
            jp: createDefaultServerData(),
            global: createDefaultServerData(),
        },
    };
};


// --- Migration Functions ---

const migrateToV2 = (data: any): any => {
    const singleProfile: Profile = {
        id: Date.now(),
        name: 'Imported Project',
        goal: data.goal || { primaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] },
        roster: [],
        isPinned: false,
    };
    return {
        version: 2,
        activeProfileId: singleProfile.id,
        profiles: [singleProfile],
        roster: data.roster || [], // Temporarily hold roster at top level
    };
};

const migrateToV3 = (data: any): any => {
    data.folders = [];
    data.layout = data.profiles.map((p: Profile) => p.id);
    data.version = 3;
    return data;
};

const migrateToV4 = (data: any): any => {
    data.inventory = [];
    const serverContext = data.activeServer || 'jp'; // data may not have this yet
    data.activeServer = serverContext;

    const newProfiles: Profile[] = [];
    data.profiles.forEach((p: Profile & { roster?: Parent[] | number[] }) => {
        const newProfile: Profile = { ...p, roster: [] };
        if (p.roster && Array.isArray(p.roster) && p.roster.length > 0) {
            if (typeof p.roster[0] === 'object' && p.roster[0] !== null) {
                (p.roster as Parent[]).forEach(parent => {
                    const newParent = { ...parent, server: serverContext };
                    data.inventory.push(newParent);
                    newProfile.roster.push(newParent.id);
                });
            }
        }
        newProfiles.push(newProfile);
    });
    data.profiles = newProfiles;
    delete data.roster; // Clean up temp roster
    data.version = 4;
    return data;
};

const migrateToV5 = (data: any): any => {
    const currentServer = data.activeServer || 'jp';
    const otherServer = currentServer === 'jp' ? 'global' : 'jp';

    const currentServerData: ServerSpecificData = {
        activeProfileId: data.activeProfileId,
        profiles: data.profiles,
        folders: data.folders,
        layout: data.layout,
    };

    data.serverData = {
        [currentServer]: currentServerData,
        [otherServer]: createDefaultServerData(),
    };

    delete data.activeProfileId;
    delete data.profiles;
    delete data.folders;
    delete data.layout;
    
    data.version = 5;
    return data;
};

const migrateToV6 = (data: any): any => {
    data.inventory.forEach((p: Parent) => {
        if (!p.hash) {
            p.hash = generateParentHash(p);
        }
    });
    data.version = 6;
    return data;
};

const migrateToV7 = (data: any): any => {
    data.inventory.forEach((p: Parent) => {
        if (p.isBorrowed === undefined) {
            p.isBorrowed = false;
        }
    });
    data.version = 7;
    return data;
};

const migrateToV8 = (data: any): any => {
    (Object.values(data.serverData) as ServerSpecificData[]).forEach(serverData => {
        serverData.profiles.forEach((p: Profile) => {
            if (p.goal) {
                // Ensure primaryBlue is an array
                if (!p.goal.primaryBlue || !Array.isArray(p.goal.primaryBlue)) {
                    p.goal.primaryBlue = [];
                }
                // Ensure secondaryBlue is an array
                if (!p.goal.secondaryBlue || !Array.isArray(p.goal.secondaryBlue)) {
                    p.goal.secondaryBlue = [];
                }
            }
        });
    });
    data.version = 8;
    return data;
};

const migrateToV9 = (data: any): any => {
    if (!data.skillPresets) {
        data.skillPresets = [];
    }
    data.version = 9;
    return data;
};

const migrateToV10 = (data: any): any => {
    const umaMapById = new Map((masterUmaListJson as Uma[]).map(uma => [uma.id, uma]));
    
    const getDisplayNameForMigration = (uma: Uma, lang: 'jp' | 'en'): string => {
        const baseName = lang === 'en' ? uma.base_name_en : uma.base_name_jp;
        const outfitName = lang === 'en' ? uma.outfit_name_en : uma.outfit_name_jp;
        if (outfitName) {
            return `${outfitName} ${baseName}`;
        }
        return baseName;
    };

    data.inventory.forEach((p: Parent) => {
        const uma = umaMapById.get(p.umaId);
        if (uma) {
            // Recalculate the name based on the new logic.
            // We assume the parent's name should reflect the language of its server.
            const lang = p.server === 'global' ? 'en' : 'jp';
            p.name = getDisplayNameForMigration(uma, lang);
        }
    });
    data.version = 10;
    return data;
};

const runSanityChecks = (data: any): any => {
    (Object.values(data.serverData) as ServerSpecificData[]).forEach(serverData => {
        serverData.profiles.forEach((p: Profile) => {
            if (!p.goal) p.goal = { primaryBlue: [], secondaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] };
            if (!p.goal.uniqueWishlist) p.goal.uniqueWishlist = [];
            if (p.isPinned === undefined) p.isPinned = false;
            if (!p.roster) p.roster = [];
        });
        serverData.folders.forEach((f: Folder) => {
            if (f.isPinned === undefined) f.isPinned = false;
        });
    });
    data.inventory.forEach((p: Parent) => {
        if (!p.uniqueSparks) p.uniqueSparks = [];
        if (!p.server) p.server = 'jp';
    });
    return data;
}

/**
 * The main migration orchestrator. It takes any data object, checks its version,
 * and applies all necessary migrations sequentially until it's up-to-date.
 */
export const migrateData = (data: any): AppData => {
    let migratedData = JSON.parse(JSON.stringify(data)); // Deep copy to avoid side effects

    if (!migratedData.version || migratedData.version < 2) migratedData = migrateToV2(migratedData);
    if (migratedData.version < 3) migratedData = migrateToV3(migratedData);
    if (migratedData.version < 4) migratedData = migrateToV4(migratedData);
    if (migratedData.version < 5) migratedData = migrateToV5(migratedData);
    if (migratedData.version < 6) migratedData = migrateToV6(migratedData);
    if (migratedData.version < 7) migratedData = migrateToV7(migratedData);
    if (migratedData.version < 8) migratedData = migrateToV8(migratedData);
    if (migratedData.version < 9) migratedData = migrateToV9(migratedData);
    if (migratedData.version < 10) migratedData = migrateToV10(migratedData);
    
    // Final check to ensure data consistency after all migrations
    migratedData = runSanityChecks(migratedData);

    return migratedData as AppData;
};