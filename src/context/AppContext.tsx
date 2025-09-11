import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import { AppData, Profile, Skill, Uma, Goal, Parent, NewParentData, WishlistItem, Folder, IconName, ServerSpecificData, ValidationResult } from '../types';
import masterSkillListJson from '../data/skill-list.json';
import masterUmaListJson from '../data/uma-list.json';
import { calculateScore } from '../utils/scoring';
import i18n from '../i18n';

const DB_KEY = 'umaTrackerData_v2';
const PREFS_KEY = 'umaTrackerPrefs_v1';
const CURRENT_VERSION = 5;

type DataDisplayLanguage = 'en' | 'jp';

interface AppContextType {
  loading: boolean;
  appData: AppData;
  activeServer: 'jp' | 'global';
  setActiveServer: (server: 'jp' | 'global') => void;
  dataDisplayLanguage: DataDisplayLanguage;
  setDataDisplayLanguage: (lang: DataDisplayLanguage) => void;
  useCommunityTranslations: boolean;
  setUseCommunityTranslations: (enabled: boolean) => void;
  changeUiLanguage: (lang: 'en' | 'jp') => void;
  masterSkillList: Skill[];
  masterUmaList: Uma[];
  skillMapByName: Map<string, Skill>;
  umaMapById: Map<string, Uma>;
  getActiveProfile: () => Profile | undefined;
  getScoredRoster: () => Parent[];
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
  moveParentToServer: (parentId: number) => { success: boolean; errors: string[] };
  validateProjectForServer: (profileId: number) => ValidationResult;
  executeCopyProject: (profileId: number) => void;
  executeMoveProject: (profileId: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const createNewProfile = (name: string): Profile => ({
  id: Date.now(),
  name,
  goal: { primaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] },
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

const createDefaultState = (): AppData => {
    return {
        version: CURRENT_VERSION,
        activeServer: 'jp',
        inventory: [],
        serverData: {
            jp: createDefaultServerData(),
            global: createDefaultServerData(),
        },
    };
};

const migrateData = (data: any): AppData => {
    let migrated = data;
    // V1 -> V2: Single project structure to multi-project
    if (!migrated.version || migrated.version < 2) {
        const singleProfile: Profile = {
            id: Date.now(),
            name: 'Imported Project',
            goal: migrated.goal || { primaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] },
            roster: [], // Will be populated later
            isPinned: false,
        };
        migrated = {
            version: 2,
            activeProfileId: singleProfile.id,
            profiles: [singleProfile],
            roster: migrated.roster || [], // Temporarily hold roster at top level
        };
    }
    
    // V2 -> V3: Add folders and layout
    if (migrated.version < 3) {
        migrated.version = 3;
        migrated.folders = [];
        migrated.layout = migrated.profiles.map((p: Profile) => p.id);
    }

    // V3 -> V4: Global inventory and server context
    if (migrated.version < 4) {
        migrated.version = 4;
        migrated.inventory = [];
        const oldPrefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        const serverContext = oldPrefs.dataMode || 'jp';
        migrated.activeServer = serverContext;

        const newProfiles: Profile[] = [];
        migrated.profiles.forEach((p: Profile & { roster?: Parent[] | number[] }) => {
            const newProfile: Profile = { ...p, roster: [] };
            if (p.roster && Array.isArray(p.roster) && p.roster.length > 0) {
                // This handles the old V2/V3 structure where roster contained full objects
                if (typeof p.roster[0] === 'object' && p.roster[0] !== null) {
                    (p.roster as Parent[]).forEach(parent => {
                        const newParent = { ...parent, server: serverContext };
                        migrated.inventory.push(newParent);
                        newProfile.roster.push(newParent.id);
                    });
                }
            }
            newProfiles.push(newProfile);
        });
        migrated.profiles = newProfiles;
    }
    
    // V4 -> V5: Server-specific workspaces
    if (migrated.version < 5) {
        const currentServer = migrated.activeServer || 'jp';
        const otherServer = currentServer === 'jp' ? 'global' : 'jp';

        const currentServerData: ServerSpecificData = {
            activeProfileId: migrated.activeProfileId,
            profiles: migrated.profiles,
            folders: migrated.folders,
            layout: migrated.layout,
        };

        migrated.serverData = {
            [currentServer]: currentServerData,
            [otherServer]: createDefaultServerData(),
        };

        delete migrated.activeProfileId;
        delete migrated.profiles;
        delete migrated.folders;
        delete migrated.layout;
        
        migrated.version = 5;
    }
    
    // Universal sanity checks for all versions
    (Object.values(migrated.serverData) as ServerSpecificData[]).forEach(serverData => {
        serverData.profiles.forEach((p: Profile) => {
            if (!p.goal) p.goal = { primaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] };
            if (!p.goal.uniqueWishlist) p.goal.uniqueWishlist = [];
            if (p.isPinned === undefined) p.isPinned = false;
            if (!p.roster) p.roster = [];
        });
        serverData.folders.forEach((f: Folder) => {
            if (f.isPinned === undefined) f.isPinned = false;
        });
    });
    migrated.inventory.forEach((p: Parent) => {
        if (!p.uniqueSparks) p.uniqueSparks = [];
        if (!p.server) p.server = 'jp';
    });

    return migrated as AppData;
};


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [fullMasterSkillList] = useState<Skill[]>(masterSkillListJson as Skill[]);
  const [fullMasterUmaList] = useState<Uma[]>(masterUmaListJson as Uma[]);
  const [appData, setAppData] = useState<AppData>(createDefaultState());
  const activeServer = appData.activeServer;

  const [dataDisplayLanguage, setDataDisplayLanguageState] = useState<DataDisplayLanguage>('en');
  const [useCommunityTranslations, setUseCommunityTranslationsState] = useState<boolean>(false);
  
  const isInitialLoad = useRef(true);

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

    const savedPrefs = localStorage.getItem(PREFS_KEY);
    if (savedPrefs) {
        try {
            const prefs = JSON.parse(savedPrefs);
            if (data && prefs.activeServer) {
                setAppData(d => ({ ...d, activeServer: prefs.activeServer }));
            }
            if (prefs.dataDisplayLanguage) setDataDisplayLanguageState(prefs.dataDisplayLanguage);
            if (prefs.useCommunityTranslations) setUseCommunityTranslationsState(prefs.useCommunityTranslations);
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

  const savePrefs = (key: string, value: any) => {
    try {
        const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        prefs[key] = value;
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error(`Could not save preference: ${key}`, e);
    }
  };

  const setActiveServer = (server: 'jp' | 'global') => {
      setAppData(prev => ({...prev, activeServer: server}));
      savePrefs('activeServer', server);
  };

  const setDataDisplayLanguage = (lang: DataDisplayLanguage) => {
    setDataDisplayLanguageState(lang);
    savePrefs('dataDisplayLanguage', lang);
  };

  const setUseCommunityTranslations = (enabled: boolean) => {
    setUseCommunityTranslationsState(enabled);
    savePrefs('useCommunityTranslations', enabled);
  };

  const changeUiLanguage = (lang: 'en' | 'jp') => {
    i18n.changeLanguage(lang);
  };

  const getBestEnglishName = (item: Skill | Uma) => {
    if (item.isGlobal) return item.name_en;
    if (useCommunityTranslations && item.name_en_community) return item.name_en_community;
    return item.name_jp;
  };

  const processedMasterSkillList = useMemo(() => {
    return fullMasterSkillList.map(skill => ({
      ...skill,
      name_en: getBestEnglishName(skill),
    }));
  }, [fullMasterSkillList, useCommunityTranslations]);
  
  const processedMasterUmaList = useMemo(() => {
    return fullMasterUmaList.map(uma => ({
      ...uma,
      name_en: getBestEnglishName(uma),
    }));
  }, [fullMasterUmaList, useCommunityTranslations]);

  const masterSkillList = useMemo(() => {
      if (activeServer === 'global') {
          return processedMasterSkillList.filter(s => s.isGlobal);
      }
      return processedMasterSkillList;
  }, [activeServer, processedMasterSkillList]);

  const masterUmaList = useMemo(() => {
      if (activeServer === 'global') {
          return processedMasterUmaList.filter(u => u.isGlobal);
      }
      return processedMasterUmaList;
  }, [activeServer, processedMasterUmaList]);

  const skillMapByName = useMemo(() => new Map(processedMasterSkillList.map(skill => [skill.name_en, skill])), [processedMasterSkillList]);
  const umaMapById = useMemo(() => new Map(processedMasterUmaList.map(uma => [uma.id, uma])), [processedMasterUmaList]);

  const saveState = (newData: AppData) => {
    setAppData(newData);
  };

  const getActiveServerData = () => appData.serverData[activeServer];

  const getActiveProfile = () => {
    const serverData = getActiveServerData();
    return serverData.profiles.find(p => p.id === serverData.activeProfileId);
  };

  const getScoredRoster = useMemo(() => () => {
    const profile = getActiveProfile();
    if (!profile) return [];
    
    const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));
    
    return profile.roster
      .map(parentId => inventoryMap.get(parentId))
      .filter((p): p is Parent => !!p && p.server === activeServer)
      .map(p => ({
        ...p,
        score: calculateScore(p, profile.goal)
      }));
  }, [appData.inventory, appData.serverData, activeServer]);

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

  const getNextGenNumber = (): number => {
    const inventory = appData.inventory.filter(p => p.server === activeServer);
    return inventory.length > 0 ? Math.max(...inventory.map(p => p.gen)) + 1 : 1;
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
    const newParent: Parent = {
      ...parentData,
      id: Date.now(),
      gen: getNextGenNumber(),
      score: 0, // Score is always calculated on the fly
      server: activeServer,
    };

    setAppData(prevData => {
      const newInventory = [...prevData.inventory, newParent];
      
      const activeServerData = prevData.serverData[prevData.activeServer];
      let newProfiles = activeServerData.profiles;
      if (profileId) {
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
    setAppData(prevData => ({
      ...prevData,
      inventory: prevData.inventory.map(p => p.id === parent.id ? { ...p, ...parent } : p)
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
  
  const moveParentToServer = (parentId: number) => {
    const parent = appData.inventory.find(p => p.id === parentId);
    if (!parent) return { success: false, errors: ["Parent not found."] };

    const sourceServer = parent.server;
    const destServer = sourceServer === 'jp' ? 'global' : 'jp';
    const errors: string[] = [];

    const destUmaList = processedMasterUmaList.filter(u => destServer === 'global' ? u.isGlobal : true);
    const destSkillList = processedMasterSkillList.filter(s => destServer === 'global' ? s.isGlobal : true);
    
    const destUmaMap = new Map(destUmaList.map(u => [u.id, u]));
    const destSkillMap = new Map(destSkillList.map(s => [s.name_en, s]));

    if (!destUmaMap.has(parent.umaId)) {
        errors.push(`Character/Outfit: ${parent.name}`);
    }

    parent.uniqueSparks.forEach(spark => {
        if (!destSkillMap.has(spark.name)) {
            errors.push(`Unique Skill: ${spark.name}`);
        }
    });

    parent.whiteSparks.forEach(spark => {
        if (!destSkillMap.has(spark.name)) {
            errors.push(`Skill: ${spark.name}`);
        }
    });

    if (errors.length > 0) {
        return { success: false, errors };
    }

    setAppData(prev => ({
        ...prev,
        inventory: prev.inventory.map(p => p.id === parentId ? { ...p, server: destServer } : p)
    }));

    return { success: true, errors: [] };
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

      const destUmaList = processedMasterUmaList.filter(u => destServer === 'global' ? u.isGlobal : true);
      const destSkillList = processedMasterSkillList.filter(s => destServer === 'global' ? s.isGlobal : true);
      const destUmaMap = new Map(destUmaList.map(u => [u.id, u]));
      const destSkillMap = new Map(destSkillList.map(s => [s.name_en, s]));

      // Validate roster
      parentsInRoster.forEach(parent => {
          if (!destUmaMap.has(parent.umaId)) {
              errors.push(t('tabs:modals.transferValidation.errorParentUma', { parentName: parent.name }));
          }
          [...parent.uniqueSparks, ...parent.whiteSparks].forEach(spark => {
              if (!destSkillMap.has(spark.name)) {
                  errors.push(t('tabs:modals.transferValidation.errorParentSkill', { parentName: parent.name, skillName: spark.name }));
              }
          });
      });

      // Validate goal
      [...profile.goal.uniqueWishlist, ...profile.goal.wishlist].forEach(item => {
          if (!destSkillMap.has(item.name)) {
              errors.push(t('tabs:modals.transferValidation.errorGoalSkill', { skillName: item.name }));
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

          const newProfile: Profile = {
              ...JSON.parse(JSON.stringify(profileToCopy)), // Deep copy
              id: Date.now(),
              name: `${profileToCopy.name} (Copy)`,
              isPinned: false, // Copies are never pinned by default
          };

          const destData = { ...prev.serverData[destServer] };
          destData.profiles = [...destData.profiles, newProfile];
          destData.layout = [...destData.layout, newProfile.id];
          
          return {
              ...prev,
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
          const destServer = sourceServer === 'jp' ? 'global' : 'jp';
          
          const sourceData = { ...prev.serverData[sourceServer] };
          const destData = { ...prev.serverData[destServer] };

          const profileToMove = sourceData.profiles.find(p => p.id === profileId);
          if (!profileToMove) return prev;

          // Remove from source
          sourceData.profiles = sourceData.profiles.filter(p => p.id !== profileId);
          sourceData.layout = sourceData.layout.filter(id => id !== profileId);
          sourceData.folders = sourceData.folders.map(f => ({
              ...f,
              profileIds: f.profileIds.filter(id => id !== profileId)
          }));

          if (sourceData.activeProfileId === profileId) {
              sourceData.activeProfileId = sourceData.profiles[0]?.id || null;
          }

          // Add to destination
          destData.profiles = [...destData.profiles, { ...profileToMove, isPinned: false }];
          destData.layout = [...destData.layout, profileToMove.id];

          const newServerData = { ...prev.serverData };
          newServerData[sourceServer] = sourceData;
          newServerData[destServer] = destData;
          
          return {
              ...prev,
              serverData: newServerData,
          };
      });
  };
  
  const value = {
    loading,
    appData,
    activeServer,
    setActiveServer,
    dataDisplayLanguage,
    setDataDisplayLanguage,
    useCommunityTranslations,
    setUseCommunityTranslations,
    changeUiLanguage,
    masterSkillList,
    masterUmaList,
    skillMapByName,
    umaMapById,
    getActiveProfile,
    getScoredRoster,
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
    validateProjectForServer,
    executeCopyProject,
    executeMoveProject,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};