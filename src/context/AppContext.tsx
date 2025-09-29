import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import { AppData, Profile, Skill, Uma, Goal, Parent, NewParentData, WishlistItem, Folder, IconName, ServerSpecificData, ValidationResult, BreedingPair, SkillPreset, ManualParentData, LegacyImportWorkerPayload, LegacyImportWorkerResponse } from '../types';
import masterSkillListJson from '../data/skill-list.json';
import masterUmaListJson from '../data/uma-list.json';
import affinityJpJson from '../data/affinity_jp.json';
import affinityGlJson from '../data/affinity_global.json';
import { calculateScore, calculateIndividualScore } from '../utils/scoring';
import i18n from '../i18n';
import { generateParentHash } from '../utils/hashing';
import { migrateData, createDefaultState, createNewProfile } from '../utils/migrationHandler';

const DB_KEY = 'umaTrackerData_v2';
const USER_PREFERENCES_KEY = 'umaTrackerPrefs_v1';

type DataDisplayLanguage = 'en' | 'jp';

// Define the structure for the affinity component data
interface AffinityComponents {
    chara_map: Record<string, string>;
    relation_points: Record<string, number>;
    chara_relations: Record<string, number[]>;
}

// Pre-load both datasets
const affinityDataSources = {
    jp: affinityJpJson as AffinityComponents,
    global: affinityGlJson as AffinityComponents,
};

// New helper to assemble display names from the refactored Uma type
export const getUmaDisplayName = (uma: Uma, lang: DataDisplayLanguage): string => {
    const baseName = lang === 'jp' ? uma.base_name_jp : uma.base_name_en;
    const outfitName = lang === 'jp' ? uma.outfit_name_jp : uma.outfit_name_en;
    
    // Fallback for JP-only outfits when viewing in English
    const finalOutfitName = (lang === 'en' && !outfitName) ? uma.outfit_name_jp : outfitName;

    if (finalOutfitName) {
        return `${finalOutfitName} ${baseName}`;
    }
    return baseName;
};

interface AppContextType {
  loading: boolean;
  appData: AppData;
  relationPoints: Map<number, number>;
  charaRelations: Map<number, Set<number>>;
  activeServer: 'jp' | 'global';
  setActiveServer: (server: 'jp' | 'global') => void;
  dataDisplayLanguage: DataDisplayLanguage;
  setDataDisplayLanguage: (lang: DataDisplayLanguage) => void;
  changeUiLanguage: (lang: 'en' | 'jp') => void;
  masterSkillList: Skill[];
  masterUmaList: Uma[];
  masterUmaListWithDisplayName: (Uma & { displayName: string })[];
  getUmaDisplayName: (uma: Uma) => string;
  skillMapByName: Map<string, Skill>;
  umaMapById: Map<string, Uma>;
  getActiveProfile: () => Profile | undefined;
  getScoredRoster: () => Parent[];
  getIndividualScore: (entity: Parent | ManualParentData) => number;
  activeBreedingPair: BreedingPair | null;
  setActiveBreedingPair: (pair: BreedingPair | null) => void;
  saveState: (newData: AppData) => void;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  deleteAllData: () => void;
  addProfile: (name: string, folderId?: string) => void;
  switchProfile: (id: number) => void;
  renameProfile: (id: number, newName: string) => void;
  deleteProfile: (id: number) => void;
  togglePinProfile: (id: number) => void;
  togglePinFolder: (id: string) => void;
  reorderLayout: (sourceIndex: number, destinationIndex: number) => void;
  reorderProfileInFolder: (folderId: string, sourceIndex: number, destIndex: number) => void;
  moveProfileToFolder: (profileId: number, folderId: string | null, destIndex?: number) => void;
  addFolder: (name: string, color: string, icon: IconName) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
  deleteFolder: (folderId: string, deleteContained: boolean) => void;
  toggleFolderCollapse: (folderId: string) => void;
  updateGoal: (goal: Goal) => void;
  updateWishlistItem: (listName: 'wishlist' | 'uniqueWishlist', oldName: string, newItem: WishlistItem) => void;
  addParent: (parentData: NewParentData, profileId?: number) => void;
  updateParent: (parent: Parent) => void;
  deleteParent: (parentId: number) => void;
  addParentToProfile: (parentId: number, profileId: number) => void;
  removeParentFromProfile: (parentId: number, profileId: number) => void;
  moveParentToServer: (parentId: number) => void;
  validateParentForServer: (parentId: number) => ValidationResult;
  validateProjectForServer: (profileId: number) => ValidationResult;
  executeCopyProject: (profileId: number) => void;
  executeMoveProject: (profileId: number) => void;
  addSkillPreset: (name: string, skillIds: number[]) => void;
  updateSkillPreset: (id: string, name: string, skillIds: number[]) => void;
  deleteSkillPreset: (id: string) => void;
  // Dev-only legacy import
  isImportingLegacy: boolean;
  legacyImportError: string | null;
  setLegacyImportError: (error: string | null) => void;
  importLegacyData: (file: File) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<AppData>(createDefaultState());
  const activeServer = appData.activeServer;

  const [dataDisplayLanguage, setDataDisplayLanguageState] = useState<DataDisplayLanguage>('en');
  const [activeBreedingPair, setActiveBreedingPair] = useState<BreedingPair | null>(null);
  const [isImportingLegacy, setIsImportingLegacy] = useState(false);
  const [legacyImportError, setLegacyImportError] = useState<string | null>(null);
  
  const isInitialLoad = useRef(true);

  const { relationPoints, charaRelations } = useMemo(() => {
    const components = affinityDataSources[activeServer];
    const points = new Map<number, number>();
    for (const [key, value] of Object.entries(components.relation_points)) {
        points.set(parseInt(key, 10), value);
    }
    const relations = new Map<number, Set<number>>();
    for (const [key, value] of Object.entries(components.chara_relations)) {
        relations.set(parseInt(key, 10), new Set(value));
    }
    return { relationPoints: points, charaRelations: relations };
  }, [activeServer]);

  useEffect(() => {
    let data: AppData | null = null;
    const savedData = localStorage.getItem(DB_KEY);

    if (savedData) {
      try {
          data = migrateData(JSON.parse(savedData));
      } catch (e) {
          console.error("Failed to parse or migrate saved data", e);
          data = createDefaultState();
      }
    }
    
    if (!data || !data.serverData.jp.profiles || data.serverData.jp.profiles.length === 0) {
      data = createDefaultState();
    }
    setAppData(data);

    const savedPreferences = localStorage.getItem(USER_PREFERENCES_KEY);
    if (savedPreferences) {
        try {
            const prefs = JSON.parse(savedPreferences);
            if (data && prefs.activeServer) {
                setAppData(d => ({ ...d, activeServer: prefs.activeServer }));
            }
            if (prefs.dataDisplayLanguage) setDataDisplayLanguageState(prefs.dataDisplayLanguage);
        } catch (e) {
            console.error("Failed to parse user preferences", e);
        }
    }

    setLoading(false);
  }, []);
  
  useEffect(() => {
    if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
    }
    localStorage.setItem(DB_KEY, JSON.stringify(appData));
  }, [appData]);

  const savePreferences = (key: string, value: any) => {
    try {
        const prefs = JSON.parse(localStorage.getItem(USER_PREFERENCES_KEY) || '{}');
        prefs[key] = value;
        localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error(`Could not save preference: ${key}`, e);
    }
  };

  const setActiveServer = (server: 'jp' | 'global') => {
      setAppData(prev => ({...prev, activeServer: server}));
      savePreferences('activeServer', server);
  };

  const setDataDisplayLanguage = (lang: DataDisplayLanguage) => {
    setDataDisplayLanguageState(lang);
    savePreferences('dataDisplayLanguage', lang);
  };

  const changeUiLanguage = (lang: 'en' | 'jp') => {
    i18n.changeLanguage(lang);
  };

  const masterSkillList = useMemo(() => {
      const allSkills = masterSkillListJson as Skill[];
      if (activeServer === 'global') {
          return allSkills.filter(s => s.isGlobal);
      }
      return allSkills;
  }, [activeServer]);

  const masterUmaList = useMemo(() => {
      const allUmas = masterUmaListJson as Uma[];
      if (activeServer === 'global') {
          return allUmas.filter(u => u.isGlobal);
      }
      return allUmas;
  }, [activeServer]);

  const getUmaDisplayNameForContext = useCallback((uma: Uma) => {
      return getUmaDisplayName(uma, dataDisplayLanguage);
  }, [dataDisplayLanguage]);

  const masterUmaListWithDisplayName = useMemo(() => {
      return masterUmaList.map(uma => ({
          ...uma,
          displayName: getUmaDisplayNameForContext(uma)
      }));
  }, [masterUmaList, getUmaDisplayNameForContext]);

  const skillMapByName = useMemo(() => new Map(masterSkillList.map(skill => [skill.name_en, skill])), [masterSkillList]);
  const umaMapById = useMemo(() => new Map(masterUmaList.map(uma => [uma.id, uma])), [masterUmaList]);

  const saveState = (newData: AppData) => {
    setAppData(newData);
  };

  const getActiveServerData = () => appData.serverData[activeServer];

  const getActiveProfile = () => {
    const serverData = getActiveServerData();
    return serverData.profiles.find(p => p.id === serverData.activeProfileId);
  };

  const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

  const getScoredRoster = useMemo(() => () => {
    const profile = getActiveProfile();
    if (!profile) return [];
    
    return profile.roster
      .map(parentId => inventoryMap.get(parentId))
      .filter((p): p is Parent => !!p && p.server === activeServer)
      .map(p => ({
        ...p,
        score: calculateScore(p, profile.goal, appData.inventory, skillMapByName)
      }));
  }, [appData.inventory, appData.serverData, activeServer, skillMapByName, inventoryMap]);

  const getIndividualScore = useCallback((entity: Parent | ManualParentData) => {
      const profile = getActiveProfile();
      if (!profile) return 0;
      return Math.round(calculateIndividualScore(entity, profile.goal, inventoryMap, skillMapByName));
  }, [getActiveProfile, inventoryMap, skillMapByName]);

  const exportData = () => {
    const jsonString = JSON.stringify(appData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `umamusume_tracker_backup_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rawData = JSON.parse(e.target?.result as string);
          const migratedData = migrateData(rawData);
          setAppData(migratedData);
          setActiveServer(migratedData.activeServer || 'jp');
          resolve();
        } catch (error) {
          console.error("Import Error:", error);
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const importLegacyData = (file: File) => {
    setIsImportingLegacy(true);
    setLegacyImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const legacyData = JSON.parse(e.target?.result as string);
            const worker = new Worker(new URL('../workers/legacyImport.worker.ts', import.meta.url), { type: 'module' });
            
            worker.onmessage = (event: MessageEvent<LegacyImportWorkerResponse>) => {
                if (event.data.type === 'success') {
                    setAppData(event.data.data);
                    setActiveServer(event.data.data.activeServer);
                } else {
                    setLegacyImportError(event.data.message);
                }
                setIsImportingLegacy(false);
                worker.terminate();
            };

            worker.onerror = (err) => {
                setLegacyImportError(`Worker error: ${err.message}`);
                setIsImportingLegacy(false);
                worker.terminate();
            };

            const payload: LegacyImportWorkerPayload = {
                legacyData,
                skillList: masterSkillListJson as Skill[],
                umaList: masterUmaListJson as Uma[],
            };
            worker.postMessage(payload);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to read or parse file.';
            setLegacyImportError(message);
            setIsImportingLegacy(false);
        }
    };
    reader.onerror = () => {
        setLegacyImportError('Failed to read the selected file.');
        setIsImportingLegacy(false);
    };
    reader.readAsText(file);
  };

  const deleteAllData = () => {
      setAppData(createDefaultState());
  };

  const updateServerData = (updater: (serverData: ServerSpecificData) => ServerSpecificData) => {
    setAppData(prev => {
        const newServerSpecificData = updater(prev.serverData[prev.activeServer]);
        return {
            ...prev,
            serverData: {
                ...prev.serverData,
                [prev.activeServer]: newServerSpecificData,
            }
        };
    });
  };

  const sortLayoutByPin = (layout: (string|number)[], profiles: Profile[], folders: Folder[]) => {
      const profilePinMap = new Map(profiles.map(p => [p.id, p.isPinned ?? false]));
      const folderPinMap = new Map(folders.map(f => [f.id, f.isPinned ?? false]));
      const isPinned = (id: string | number) => typeof id === 'string' ? folderPinMap.get(id) : profilePinMap.get(id);
      return [...layout].sort((a, b) => (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0));
  };

  const sortProfileIdsByPin = (profileIds: number[], profiles: Profile[]) => {
      const profilePinMap = new Map(profiles.map(p => [p.id, p.isPinned ?? false]));
      const isPinned = (id: number) => profilePinMap.get(id);
      return [...profileIds].sort((a, b) => (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0));
  };

  const addProfile = (name: string, folderId?: string) => {
    const newProfile = createNewProfile(name);
    updateServerData(serverData => {
        const newProfiles = [...serverData.profiles, newProfile];
        let newFolders = serverData.folders;
        let newLayout = serverData.layout;

        if (folderId) {
            newFolders = serverData.folders.map(f => {
                if (f.id === folderId) {
                    const updatedProfileIds = sortProfileIdsByPin([...f.profileIds, newProfile.id], newProfiles);
                    return { ...f, profileIds: updatedProfileIds };
                }
                return f;
            });
        } else {
            newLayout = sortLayoutByPin([...serverData.layout, newProfile.id], newProfiles, newFolders);
        }
        
        return {
            ...serverData,
            profiles: newProfiles,
            folders: newFolders,
            layout: newLayout,
            activeProfileId: newProfile.id,
        };
    });
  };

  const switchProfile = (id: number) => {
    updateServerData(d => ({ ...d, activeProfileId: id }));
  };

  const renameProfile = (id: number, newName: string) => {
    updateServerData(d => ({
      ...d,
      profiles: d.profiles.map(p => p.id === id ? { ...p, name: newName } : p),
    }));
  };

  const deleteProfile = (id: number) => {
    updateServerData(d => {
      const newProfiles = d.profiles.filter(p => p.id !== id);
      const newLayout = d.layout.filter(item => item !== id);
      const newFolders = d.folders.map(f => ({
          ...f,
          profileIds: f.profileIds.filter(pid => pid !== id),
      }));
      
      let newActiveId = d.activeProfileId;
      if (newActiveId === id) {
        newActiveId = newProfiles.length > 0 ? newProfiles[0].id : null;
      }
      return { ...d, profiles: newProfiles, layout: newLayout, folders: newFolders, activeProfileId: newActiveId };
    });
  };

  const togglePinProfile = (id: number) => {
    updateServerData(d => {
        const newProfiles = d.profiles.map(p => 
            p.id === id ? { ...p, isPinned: !p.isPinned } : p
        );
        const newLayout = sortLayoutByPin(d.layout, newProfiles, d.folders);
        const newFolders = d.folders.map(folder => {
            if (folder.profileIds.includes(id)) {
                const sortedProfileIds = sortProfileIdsByPin(folder.profileIds, newProfiles);
                return { ...folder, profileIds: sortedProfileIds };
            }
            return folder;
        });
        return { ...d, profiles: newProfiles, layout: newLayout, folders: newFolders };
    });
  };

  const togglePinFolder = (id: string) => {
    updateServerData(d => {
        const newFolders = d.folders.map(f =>
            f.id === id ? { ...f, isPinned: !f.isPinned } : f
        );
        const newLayout = sortLayoutByPin(d.layout, d.profiles, newFolders);
        return { ...d, folders: newFolders, layout: newLayout };
    });
  };

  const reorderLayout = (sourceIndex: number, destinationIndex: number) => {
     updateServerData(d => {
        const layoutCopy = [...d.layout];
        const profilePinMap = new Map(d.profiles.map(p => [p.id, p.isPinned ?? false]));
        const folderPinMap = new Map(d.folders.map(f => [f.id, f.isPinned ?? false]));
        const isPinned = (id: string | number) => typeof id === 'string' ? folderPinMap.get(id) : profilePinMap.get(id);

        if (isPinned(layoutCopy[sourceIndex])) return d;

        const firstUnpinnedIndex = layoutCopy.findIndex(id => !isPinned(id));
        const pinnedZoneEnd = firstUnpinnedIndex === -1 ? layoutCopy.length : firstUnpinnedIndex;

        if (destinationIndex < pinnedZoneEnd) return d;

        const [removed] = layoutCopy.splice(sourceIndex, 1);
        layoutCopy.splice(destinationIndex, 0, removed);
        return { ...d, layout: layoutCopy };
    });
  };

  const reorderProfileInFolder = (folderId: string, sourceIndex: number, destIndex: number) => {
    updateServerData(d => {
      const profilePinMap = new Map(d.profiles.map(p => [p.id, p.isPinned ?? false]));
      const isPinned = (id: number) => profilePinMap.get(id);

      const folder = d.folders.find(f => f.id === folderId);
      if (!folder) return d;

      const profileIds = folder.profileIds;
      if (isPinned(profileIds[sourceIndex])) return d;

      const firstUnpinnedIndex = profileIds.findIndex(id => !isPinned(id));
      const pinnedZoneEnd = firstUnpinnedIndex === -1 ? profileIds.length : firstUnpinnedIndex;

      if (destIndex < pinnedZoneEnd) return d;

      const foldersCopy = d.folders.map(f => {
        if (f.id === folderId) {
          const profileIdsCopy = [...f.profileIds];
          const [removed] = profileIdsCopy.splice(sourceIndex, 1);
          profileIdsCopy.splice(destIndex, 0, removed);
          return { ...f, profileIds: profileIdsCopy };
        }
        return f;
      });

      return { ...d, folders: foldersCopy };
    });
  };

  const moveProfileToFolder = (profileId: number, folderId: string | null, destIndex: number = -1) => {
      updateServerData(d => {
          let newData = { ...d };
          newData.layout = newData.layout.filter(item => item !== profileId);
          newData.folders = newData.folders.map(f => ({
              ...f,
              profileIds: f.profileIds.filter(pId => pId !== profileId)
          }));

          if (folderId) {
              newData.folders = newData.folders.map(f => {
                  if (f.id === folderId) {
                      let newProfileIds = [...f.profileIds];
                      if (destIndex > -1) newProfileIds.splice(destIndex, 0, profileId);
                      else newProfileIds.push(profileId);
                      const sortedIds = sortProfileIdsByPin(newProfileIds, newData.profiles);
                      return { ...f, profileIds: sortedIds };
                  }
                  return f;
              });
          } else {
              const newLayout = [...newData.layout];
              const profilesMap = new Map(newData.profiles.map(p => [p.id, p]));
              const foldersMap = new Map(newData.folders.map(f => [f.id, f]));
              let firstUnpinnedIndex = newLayout.findIndex(id => {
                  const item = typeof id === 'string' ? foldersMap.get(id) : profilesMap.get(id);
                  return !item?.isPinned;
              });
              if (firstUnpinnedIndex === -1) firstUnpinnedIndex = newLayout.length;
              const finalIndex = destIndex > -1 ? Math.max(firstUnpinnedIndex, destIndex) : firstUnpinnedIndex;
              newLayout.splice(finalIndex, 0, profileId);
              newData.layout = newLayout;
          }
          return newData;
      });
  };

  const addFolder = (name: string, color: string, icon: IconName) => {
      const newFolder: Folder = {
          id: `f${Date.now()}`, name, color, icon,
          isCollapsed: false, profileIds: [], isPinned: false,
      };
      updateServerData(d => ({
          ...d,
          folders: [...d.folders, newFolder],
          layout: [...d.layout, newFolder.id],
      }));
  };

  const updateFolder = (folderId: string, updates: Partial<Folder>) => {
      updateServerData(d => ({
          ...d,
          folders: d.folders.map(f => f.id === folderId ? { ...f, ...updates } : f)
      }));
  };

  const deleteFolder = (folderId: string, deleteContained: boolean) => {
      updateServerData(d => {
          const folderToDelete = d.folders.find(f => f.id === folderId);
          if (!folderToDelete) return d;

          const newFolders = d.folders.filter(f => f.id !== folderId);
          let newLayout = d.layout.filter(item => item !== folderId);
          let newProfiles = [...d.profiles];

          if (deleteContained) {
              const idsToDelete = new Set(folderToDelete.profileIds);
              newProfiles = newProfiles.filter(p => !idsToDelete.has(p.id));
          } else {
              newLayout = [...newLayout, ...folderToDelete.profileIds];
          }
          
          return { ...d, folders: newFolders, layout: newLayout, profiles: newProfiles };
      });
  };

  const toggleFolderCollapse = (folderId: string) => {
      updateServerData(d => ({
          ...d,
          folders: d.folders.map(f => f.id === folderId ? { ...f, isCollapsed: !f.isCollapsed } : f)
      }));
  };
  
  const updateGoal = (goal: Goal) => {
    updateServerData(d => ({
      ...d,
      profiles: d.profiles.map(p => 
        p.id === d.activeProfileId ? { ...p, goal } : p
      )
    }));
  };

  const updateWishlistItem = (listName: 'wishlist' | 'uniqueWishlist', oldName: string, newItem: WishlistItem) => {
    updateServerData(d => ({
      ...d,
      profiles: d.profiles.map(p => {
        if (p.id === d.activeProfileId) {
          const newGoal = { ...p.goal };
          const list = newGoal[listName] as WishlistItem[];
          const itemIndex = list.findIndex(i => i.name === oldName);
          if (itemIndex === -1) return p;
          list[itemIndex] = newItem;
          return { ...p, goal: newGoal };
        }
        return p;
      })
    }));
  };

  const getNextGenNumberForCharacter = (umaId: string): number => {
    const targetUma = umaMapById.get(umaId);
    if (!targetUma) {
      const inventoryForUma = appData.inventory.filter(p => p.server === activeServer && p.umaId === umaId);
      return inventoryForUma.length > 0 ? Math.max(...inventoryForUma.map(p => p.gen)) + 1 : 1;
    }

    const targetCharacterId = targetUma.characterId;

    const inventoryForCharacter = appData.inventory.filter(p => {
        if (p.server !== activeServer) return false;
        const parentUma = umaMapById.get(p.umaId);
        return parentUma?.characterId === targetCharacterId;
    });

    return inventoryForCharacter.length > 0 ? Math.max(...inventoryForCharacter.map(p => p.gen)) + 1 : 1;
  };

  const addParentToProfile = (parentId: number, profileId: number) => {
    updateServerData(d => ({
      ...d,
      profiles: d.profiles.map(p => {
        if (p.id === profileId && !p.roster.includes(parentId)) {
          return { ...p, roster: [...p.roster, parentId] };
        }
        return p;
      })
    }));
  };

  const removeParentFromProfile = (parentId: number, profileId: number) => {
    updateServerData(d => ({
      ...d,
      profiles: d.profiles.map(p => 
        p.id === profileId 
        ? { ...p, roster: p.roster.filter(id => id !== parentId) } 
        : p
      )
    }));
  };

  const addParent = (parentData: NewParentData, profileId?: number) => {
    const newHash = generateParentHash(parentData);
    const isDuplicate = appData.inventory.some(p => p.hash === newHash && p.server === activeServer);
    if (isDuplicate) {
        throw new Error(i18n.t('modals:duplicateParentError'));
    }

    const uma = umaMapById.get(parentData.umaId);
    const displayName = uma ? getUmaDisplayName(uma, activeServer === 'global' ? 'en' : 'jp') : parentData.name;

    const newParent: Parent = {
      ...parentData,
      name: displayName,
      id: Date.now(),
      gen: parentData.isBorrowed ? 0 : getNextGenNumberForCharacter(parentData.umaId),
      score: 0, // Score is always calculated on the fly
      server: activeServer,
      hash: newHash,
    };

    setAppData(prevData => {
      const newInventory = [...prevData.inventory, newParent];
      
      const activeServerData = prevData.serverData[prevData.activeServer];
      let newProfiles = activeServerData.profiles;
      if (profileId && !newParent.isBorrowed) {
        newProfiles = newProfiles.map(p => {
          if (p.id === profileId) {
            return { ...p, roster: [...p.roster, newParent.id] };
          }
          return p;
        });
      }

      return { 
          ...prevData, 
          inventory: newInventory, 
          skillPresets: prevData.skillPresets || [],
          serverData: {
              ...prevData.serverData,
              [prevData.activeServer]: {
                  ...activeServerData,
                  profiles: newProfiles
              }
          } 
      };
    });
  };

  const updateParent = (parent: Parent) => {
    const newHash = generateParentHash(parent);
    const isDuplicate = appData.inventory.some(p => p.id !== parent.id && p.hash === newHash && p.server === activeServer);
    if (isDuplicate) {
        throw new Error(i18n.t('modals:duplicateParentError'));
    }
    
    const uma = umaMapById.get(parent.umaId);
    const displayName = uma ? getUmaDisplayName(uma, parent.server === 'global' ? 'en' : 'jp') : parent.name;

    setAppData(prevData => ({
      ...prevData,
      inventory: prevData.inventory.map(p => p.id === parent.id ? { ...p, ...parent, name: displayName, hash: newHash } : p)
    }));
  };
  
  const deleteParent = (parentId: number) => {
    setAppData(prevData => {
        const newInventory = prevData.inventory.filter(p => p.id !== parentId);
        const newServerData = { ...prevData.serverData };
        for (const server in newServerData) {
            newServerData[server as keyof typeof newServerData].profiles = newServerData[server as keyof typeof newServerData].profiles.map(p => ({
                ...p,
                roster: p.roster.filter(id => id !== parentId)
            }));
        }
        return { ...prevData, inventory: newInventory, serverData: newServerData };
    });
  };
  
  const validateParentForServer = (parentId: number): ValidationResult => {
    const parent = appData.inventory.find(p => p.id === parentId);
    if (!parent) return { errors: ["Parent not found."] };

    const sourceServer = parent.server;
    const destServer = sourceServer === 'jp' ? 'global' : 'jp';
    const errors: string[] = [];

    const allUmas = masterUmaListJson as Uma[];
    const allSkills = masterSkillListJson as Skill[];

    const destUmaList = allUmas.filter(u => destServer === 'global' ? u.isGlobal : true);
    const destSkillList = allSkills.filter(s => destServer === 'global' ? s.isGlobal : true);
    
    const destUmaMap = new Map(destUmaList.map(u => [u.id, u]));
    const destSkillMap = new Map(destSkillList.map(s => [s.name_en, s]));

    if (!destUmaMap.has(parent.umaId)) {
        const uma = umaMapById.get(parent.umaId);
        const umaName = uma ? getUmaDisplayName(uma, 'en') : parent.name;
        errors.push(`Character/Outfit: ${umaName}`);
    }

    [...parent.uniqueSparks, ...parent.whiteSparks].forEach(spark => {
        if (!destSkillMap.has(spark.name)) {
            const skill = skillMapByName.get(spark.name);
            const skillName = skill ? skill.name_en : spark.name;
            errors.push(`Skill: ${skillName}`);
        }
    });

    return { errors };
  };
  
  const moveParentToServer = (parentId: number) => {
      const parent = appData.inventory.find(p => p.id === parentId);
      if (!parent) return;
      const destServer: 'jp' | 'global' = parent.server === 'jp' ? 'global' : 'jp';

      setAppData(prev => ({
          ...prev,
          inventory: prev.inventory.map((p): Parent => p.id === parentId ? { ...p, server: destServer } : p)
      }));
  };
  
  const validateProjectForServer = (profileId: number): ValidationResult => {
      const sourceServer = activeServer;
      const destServer = sourceServer === 'jp' ? 'global' : 'jp';
      const errors: string[] = [];
      const { t } = i18n;

      const profile = appData.serverData[sourceServer].profiles.find(p => p.id === profileId);
      if (!profile) return { errors: ["Project not found."] };

      const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));
      const parentsInRoster = profile.roster.map(id => inventoryMap.get(id)).filter(Boolean) as Parent[];

      const allUmas = masterUmaListJson as Uma[];
      const allSkills = masterSkillListJson as Skill[];
      const destUmaList = allUmas.filter(u => destServer === 'global' ? u.isGlobal : true);
      const destSkillList = allSkills.filter(s => destServer === 'global' ? s.isGlobal : true);
      const destUmaMap = new Map(destUmaList.map(u => [u.id, u]));
      const destSkillMap = new Map(destSkillList.map(s => [s.name_en, s]));

      // Validate roster
      parentsInRoster.forEach(parent => {
          const uma = umaMapById.get(parent.umaId);
          const parentDisplayName = uma ? getUmaDisplayName(uma, 'en') : parent.name;
          if (!destUmaMap.has(parent.umaId)) {
              errors.push(t('tabs:modals.transferValidation.errorParentUma', { parentName: parentDisplayName }));
          }
          [...parent.uniqueSparks, ...parent.whiteSparks].forEach(spark => {
              const skill = skillMapByName.get(spark.name);
              const skillDisplayName = skill ? skill.name_en : spark.name;
              if (!destSkillMap.has(spark.name)) {
                  errors.push(t('tabs:modals.transferValidation.errorParentSkill', { parentName: parentDisplayName, skillName: skillDisplayName }));
              }
          });
      });

      // Validate goal
      [...profile.goal.uniqueWishlist, ...profile.goal.wishlist].forEach(item => {
          const skill = skillMapByName.get(item.name);
          const skillDisplayName = skill ? skill.name_en : item.name;
          if (!destSkillMap.has(item.name)) {
              errors.push(t('tabs:modals.transferValidation.errorGoalSkill', { skillName: skillDisplayName }));
          }
      });

      return { errors: [...new Set(errors)] }; // Return unique errors
  };

  const executeCopyProject = (profileId: number) => {
      setAppData(prev => {
          const sourceServer = prev.activeServer;
          const destServer = sourceServer === 'jp' ? 'global' : 'jp';
          const sourceData = prev.serverData[sourceServer];
          
          const profileToCopy = sourceData.profiles.find(p => p.id === profileId);
          if (!profileToCopy) return prev;
          
          const parentsToCopy = profileToCopy.roster
              .map(id => prev.inventory.find(p => p.id === id))
              .filter((p): p is Parent => !!p);

          let newInventory = [...prev.inventory];
          const idMapping = new Map<number, number>();
          let timestamp = Date.now();

          parentsToCopy.forEach((parent, index) => {
              const newParent = {
                  ...JSON.parse(JSON.stringify(parent)),
                  id: timestamp + index, // Create new unique ID
                  server: destServer,
              };
              newInventory.push(newParent);
              idMapping.set(parent.id, newParent.id);
          });
          
          const newProfile: Profile = {
              ...JSON.parse(JSON.stringify(profileToCopy)),
              id: timestamp + parentsToCopy.length, // Ensure unique ID
              name: `${profileToCopy.name} (Copy)`,
              isPinned: false,
              roster: profileToCopy.roster.map(oldId => idMapping.get(oldId) || oldId), // Use new parent IDs
          };

          const destData = { ...prev.serverData[destServer] };
          destData.profiles = [...destData.profiles, newProfile];
          destData.layout = [...destData.layout, newProfile.id];
          
          return {
              ...prev,
              inventory: newInventory,
              skillPresets: prev.skillPresets || [],
              serverData: {
                  ...prev.serverData,
                  [destServer]: destData
              }
          };
      });
  };

  const executeMoveProject = (profileId: number) => {
      setAppData(prev => {
          const sourceServer = prev.activeServer;
          const destServer: 'jp' | 'global' = sourceServer === 'jp' ? 'global' : 'jp';
          
          const sourceData = { ...prev.serverData[sourceServer] };
          const destData = { ...prev.serverData[destServer] };

          const profileToMove = sourceData.profiles.find(p => p.id === profileId);
          if (!profileToMove) return prev;
          
          const parentIdsToMove = new Set(profileToMove.roster);

          // 1. Update inventory
          const newInventory = prev.inventory.map((parent): Parent => {
              if (parentIdsToMove.has(parent.id)) {
                  return { ...parent, server: destServer };
              }
              return parent;
          });

          // 2. Remove from source
          sourceData.profiles = sourceData.profiles.filter(p => p.id !== profileId);
          sourceData.layout = sourceData.layout.filter(id => id !== profileId);
          sourceData.folders = sourceData.folders.map(f => ({
              ...f,
              profileIds: f.profileIds.filter(id => id !== profileId)
          }));

          if (sourceData.activeProfileId === profileId) {
              sourceData.activeProfileId = sourceData.profiles[0]?.id || null;
          }

          // 3. Add to destination
          destData.profiles = [...destData.profiles, { ...profileToMove, isPinned: false }];
          destData.layout = [...destData.layout, profileToMove.id];

          const newServerData = { ...prev.serverData };
          newServerData[sourceServer] = sourceData;
          newServerData[destServer] = destData;
          
          return {
              ...prev,
              inventory: newInventory,
              skillPresets: prev.skillPresets || [],
              serverData: newServerData,
          };
      });
  };

  const addSkillPreset = (name: string, skillIds: number[]) => {
      const newPreset: SkillPreset = { id: `p${Date.now()}`, name, skillIds };
      setAppData(prev => ({ ...prev, skillPresets: [...prev.skillPresets, newPreset] }));
  };

  const updateSkillPreset = (id: string, name: string, skillIds: number[]) => {
      setAppData(prev => ({
          ...prev,
          skillPresets: prev.skillPresets.map(p => p.id === id ? { ...p, name, skillIds } : p),
      }));
  };

  const deleteSkillPreset = (id: string) => {
      setAppData(prev => ({
          ...prev,
          skillPresets: prev.skillPresets.filter(p => p.id !== id),
      }));
  };
  
  const value = {
    loading,
    appData,
    relationPoints,
    charaRelations,
    activeServer,
    setActiveServer,
    dataDisplayLanguage,
    setDataDisplayLanguage,
    changeUiLanguage,
    masterSkillList,
    masterUmaList,
    masterUmaListWithDisplayName,
    getUmaDisplayName: getUmaDisplayNameForContext,
    skillMapByName,
    umaMapById,
    getActiveProfile,
    getScoredRoster,
    getIndividualScore,
    activeBreedingPair,
    setActiveBreedingPair,
    saveState,
    exportData,
    importData,
    deleteAllData,
    addProfile,
    switchProfile,
    renameProfile,
    deleteProfile,
    togglePinProfile,
    togglePinFolder,
    reorderLayout,
    reorderProfileInFolder,
    moveProfileToFolder,
    addFolder,
    updateFolder,
    deleteFolder,
    toggleFolderCollapse,
    updateGoal,
    updateWishlistItem,
    addParent,
    updateParent,
    deleteParent,
    addParentToProfile,
    removeParentFromProfile,
    moveParentToServer,
    validateParentForServer,
    validateProjectForServer,
    executeCopyProject,
    executeMoveProject,
    addSkillPreset,
    updateSkillPreset,
    deleteSkillPreset,
    isImportingLegacy,
    legacyImportError,
    setLegacyImportError,
    importLegacyData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};