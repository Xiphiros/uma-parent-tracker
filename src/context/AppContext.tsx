import { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import { AppData, Profile, Skill, Uma, Goal, Parent, NewParentData, WishlistItem, Folder, IconName } from '../types';
import masterSkillListJson from '../data/skill-list.json';
import masterUmaListJson from '../data/uma-list.json';
import { calculateScore } from '../utils/scoring';

const DB_KEY = 'umaTrackerData_v2';
const PREFS_KEY = 'umaTrackerPrefs_v1';
const CURRENT_VERSION = 3;

type DataMode = 'jp' | 'global';

interface AppContextType {
  loading: boolean;
  appData: AppData;
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  masterSkillList: Skill[];
  masterUmaList: Uma[];
  getActiveProfile: () => Profile | undefined;
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
  addParent: (parentData: NewParentData) => void;
  updateParent: (parent: Parent) => void;
  deleteParent: (parentId: number) => void;
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

const createDefaultState = (): AppData => {
    const firstProfile = createNewProfile('My First Project');
    return {
        version: CURRENT_VERSION,
        activeProfileId: firstProfile.id,
        profiles: [firstProfile],
        folders: [],
        layout: [firstProfile.id],
    };
};

const migrateData = (data: any): AppData => {
    // V1 -> V2: Single project structure to multi-project
    if (!data.version || data.version < 2) {
        const singleProfile = createNewProfile('Imported Project');
        singleProfile.goal = data.goal || { primaryBlue: [], primaryPink: [], uniqueWishlist: [], wishlist: [] };
        singleProfile.roster = data.roster || [];
        data = {
            version: 2,
            activeProfileId: singleProfile.id,
            profiles: [singleProfile],
        };
    }
    
    // V2 -> V3: Add folders and layout
    if (data.version < 3) {
        data.version = 3;
        data.folders = [];
        data.layout = data.profiles.map((p: Profile) => p.id);
    }
    
    // Universal sanity checks for all versions
    data.profiles.forEach((p: Profile) => {
        if (!p.goal.uniqueWishlist) p.goal.uniqueWishlist = [];
        if (p.isPinned === undefined) p.isPinned = false;
        p.roster.forEach(parent => {
            if (!parent.uniqueSparks) parent.uniqueSparks = [];
        });
    });
    data.folders.forEach((f: Folder) => {
        if (f.isPinned === undefined) f.isPinned = false;
    });

    return data as AppData;
};


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [fullMasterSkillList] = useState<Skill[]>(masterSkillListJson as Skill[]);
  const [fullMasterUmaList] = useState<Uma[]>(masterUmaListJson as Uma[]);
  const [dataMode, setDataModeState] = useState<DataMode>('jp');
  const [appData, setAppData] = useState<AppData>({
    version: CURRENT_VERSION,
    activeProfileId: null,
    profiles: [],
    folders: [],
    layout: [],
  });

  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Load main app data
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
    
    if (!data || data.profiles.length === 0) {
      data = createDefaultState();
    }
    setAppData(data);

    // Load user preferences
    const savedPrefs = localStorage.getItem(PREFS_KEY);
    if (savedPrefs) {
        try {
            const prefs = JSON.parse(savedPrefs);
            if (prefs.dataMode) setDataModeState(prefs.dataMode);
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

  const setDataMode = (mode: DataMode) => {
      setDataModeState(mode);
      try {
          const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
          prefs.dataMode = mode;
          localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch (e) {
          console.error("Could not save data mode preference", e);
      }
  };

  const masterSkillList = useMemo(() => {
      if (dataMode === 'global') {
          return fullMasterSkillList.filter(s => s.isGlobal);
      }
      return fullMasterSkillList;
  }, [dataMode, fullMasterSkillList]);

  const masterUmaList = useMemo(() => {
      if (dataMode === 'global') {
          return fullMasterUmaList.filter(u => u.isGlobal);
      }
      return fullMasterUmaList;
  }, [dataMode, fullMasterUmaList]);

  const saveState = (newData: AppData) => {
    setAppData(newData);
  };

  const getActiveProfile = () => {
    return appData.profiles.find(p => p.id === appData.activeProfileId);
  };

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
    setAppData(prevData => {
        const newProfiles = [...prevData.profiles, newProfile];
        let newFolders = prevData.folders;
        let newLayout = prevData.layout;

        if (folderId) {
            newFolders = prevData.folders.map(f => {
                if (f.id === folderId) {
                    const updatedProfileIds = sortProfileIdsByPin([...f.profileIds, newProfile.id], newProfiles);
                    return { ...f, profileIds: updatedProfileIds };
                }
                return f;
            });
        } else {
            newLayout = sortLayoutByPin([...prevData.layout, newProfile.id], newProfiles, newFolders);
        }
        
        return {
            ...prevData,
            profiles: newProfiles,
            folders: newFolders,
            layout: newLayout,
            activeProfileId: newProfile.id,
        };
    });
  };

  const switchProfile = (id: number) => {
    setAppData(prevData => ({ ...prevData, activeProfileId: id }));
  };

  const renameProfile = (id: number, newName: string) => {
    setAppData(prevData => ({
      ...prevData,
      profiles: prevData.profiles.map(p => p.id === id ? { ...p, name: newName } : p),
    }));
  };

  const deleteProfile = (id: number) => {
    setAppData(prevData => {
      const newProfiles = prevData.profiles.filter(p => p.id !== id);
      const newLayout = prevData.layout.filter(item => item !== id);
      const newFolders = prevData.folders.map(f => ({
          ...f,
          profileIds: f.profileIds.filter(pid => pid !== id),
      }));
      
      let newActiveId = prevData.activeProfileId;
      if (newActiveId === id) {
        newActiveId = newProfiles.length > 0 ? newProfiles[0].id : null;
      }
      return { ...prevData, profiles: newProfiles, layout: newLayout, folders: newFolders, activeProfileId: newActiveId };
    });
  };

  const togglePinProfile = (id: number) => {
    setAppData(prevData => {
        const newProfiles = prevData.profiles.map(p => 
            p.id === id ? { ...p, isPinned: !p.isPinned } : p
        );
        const newLayout = sortLayoutByPin(prevData.layout, newProfiles, prevData.folders);
        const newFolders = prevData.folders.map(folder => {
            if (folder.profileIds.includes(id)) {
                const sortedProfileIds = sortProfileIdsByPin(folder.profileIds, newProfiles);
                return { ...folder, profileIds: sortedProfileIds };
            }
            return folder;
        });
        return { ...prevData, profiles: newProfiles, layout: newLayout, folders: newFolders };
    });
  };

  const togglePinFolder = (id: string) => {
    setAppData(prevData => {
        const newFolders = prevData.folders.map(f =>
            f.id === id ? { ...f, isPinned: !f.isPinned } : f
        );
        const newLayout = sortLayoutByPin(prevData.layout, prevData.profiles, newFolders);
        return { ...prevData, folders: newFolders, layout: newLayout };
    });
  };

  const reorderLayout = (sourceIndex: number, destinationIndex: number) => {
     setAppData(prevData => {
        const layoutCopy = [...prevData.layout];
        const profilePinMap = new Map(prevData.profiles.map(p => [p.id, p.isPinned ?? false]));
        const folderPinMap = new Map(prevData.folders.map(f => [f.id, f.isPinned ?? false]));
        const isPinned = (id: string | number) => typeof id === 'string' ? folderPinMap.get(id) : profilePinMap.get(id);

        // A pinned item cannot be the source of a move.
        if (isPinned(layoutCopy[sourceIndex])) {
            return prevData;
        }

        // Find the boundary of the pinned items.
        const firstUnpinnedIndex = layoutCopy.findIndex(id => !isPinned(id));
        const pinnedZoneEnd = firstUnpinnedIndex === -1 ? layoutCopy.length : firstUnpinnedIndex;

        // If the destination is in the pinned zone, block the move.
        if (destinationIndex < pinnedZoneEnd) {
            return prevData;
        }

        const [removed] = layoutCopy.splice(sourceIndex, 1);
        layoutCopy.splice(destinationIndex, 0, removed);
        return { ...prevData, layout: layoutCopy };
    });
  };

  const reorderProfileInFolder = (folderId: string, sourceIndex: number, destIndex: number) => {
    setAppData(prevData => {
      const profilePinMap = new Map(prevData.profiles.map(p => [p.id, p.isPinned ?? false]));
      const isPinned = (id: number) => profilePinMap.get(id);

      const folder = prevData.folders.find(f => f.id === folderId);
      if (!folder) return prevData;

      const profileIds = folder.profileIds;
      
      // A pinned item cannot be the source of a move.
      if (isPinned(profileIds[sourceIndex])) {
          return prevData;
      }

      const firstUnpinnedIndex = profileIds.findIndex(id => !isPinned(id));
      const pinnedZoneEnd = firstUnpinnedIndex === -1 ? profileIds.length : firstUnpinnedIndex;

      // If the destination is in the pinned zone, block the move.
      if (destIndex < pinnedZoneEnd) {
          return prevData;
      }

      const foldersCopy = prevData.folders.map(f => {
        if (f.id === folderId) {
          const profileIdsCopy = [...f.profileIds];
          const [removed] = profileIdsCopy.splice(sourceIndex, 1);
          profileIdsCopy.splice(destIndex, 0, removed);
          return { ...f, profileIds: profileIdsCopy };
        }
        return f;
      });

      return { ...prevData, folders: foldersCopy };
    });
  };

  const moveProfileToFolder = (profileId: number, folderId: string | null, destIndex: number = -1) => {
      setAppData(prevData => {
          let newData = { ...prevData };
          // 1. Remove from old location (either layout or another folder)
          newData.layout = newData.layout.filter(item => item !== profileId);
          newData.folders = newData.folders.map(f => ({
              ...f,
              profileIds: f.profileIds.filter(pId => pId !== profileId)
          }));

          // 2. Add to new location
          if (folderId) {
              newData.folders = newData.folders.map(f => {
                  if (f.id === folderId) {
                      let newProfileIds = [...f.profileIds];
                      if (destIndex > -1) {
                          newProfileIds.splice(destIndex, 0, profileId);
                      } else {
                          newProfileIds.push(profileId);
                      }
                      // Always re-sort the folder's contents by pin status after a move.
                      const sortedIds = sortProfileIdsByPin(newProfileIds, newData.profiles);
                      return { ...f, profileIds: sortedIds };
                  }
                  return f;
              });
          } else {
              const newLayout = [...newData.layout];
              const profilesMap = new Map(newData.profiles.map(p => [p.id, p]));
              const foldersMap = new Map(newData.folders.map(f => [f.id, f]));

              // Find the index of the first unpinned item in the layout
              let firstUnpinnedIndex = newLayout.findIndex(id => {
                  const item = typeof id === 'string' ? foldersMap.get(id) : profilesMap.get(id);
                  return !item?.isPinned;
              });

              // If all items are pinned, or layout is empty, append to the end
              if (firstUnpinnedIndex === -1) {
                  firstUnpinnedIndex = newLayout.length;
              }

              // An unpinned item can't be dropped before the first unpinned item
              const finalIndex = destIndex > -1 ? Math.max(firstUnpinnedIndex, destIndex) : firstUnpinnedIndex;
              
              newLayout.splice(finalIndex, 0, profileId);
              newData.layout = newLayout;
          }
          return newData;
      });
  };

  const addFolder = (name: string, color: string, icon: IconName) => {
      const newFolder: Folder = {
          id: `f${Date.now()}`,
          name,
          color,
          icon,
          isCollapsed: false,
          profileIds: [],
          isPinned: false,
      };
      setAppData(prevData => ({
          ...prevData,
          folders: [...prevData.folders, newFolder],
          layout: [...prevData.layout, newFolder.id],
      }));
  };

  const updateFolder = (folderId: string, updates: Partial<Folder>) => {
      setAppData(prevData => ({
          ...prevData,
          folders: prevData.folders.map(f => f.id === folderId ? { ...f, ...updates } : f)
      }));
  };

  const deleteFolder = (folderId: string, deleteContained: boolean) => {
      setAppData(prevData => {
          const folderToDelete = prevData.folders.find(f => f.id === folderId);
          if (!folderToDelete) return prevData;

          const newFolders = prevData.folders.filter(f => f.id !== folderId);
          let newLayout = prevData.layout.filter(item => item !== folderId);
          let newProfiles = [...prevData.profiles];

          if (deleteContained) {
              const idsToDelete = new Set(folderToDelete.profileIds);
              newProfiles = newProfiles.filter(p => !idsToDelete.has(p.id));
          } else {
              // Move profiles to top-level layout
              newLayout = [...newLayout, ...folderToDelete.profileIds];
          }
          
          return { ...prevData, folders: newFolders, layout: newLayout, profiles: newProfiles };
      });
  };

  const toggleFolderCollapse = (folderId: string) => {
      setAppData(prevData => ({
          ...prevData,
          folders: prevData.folders.map(f => f.id === folderId ? { ...f, isCollapsed: !f.isCollapsed } : f)
      }));
  };
  
  const updateGoal = (goal: Goal) => {
    setAppData(prevData => ({
      ...prevData,
      profiles: prevData.profiles.map(p => {
        if (p.id === prevData.activeProfileId) {
          const updatedRoster = p.roster.map(parent => ({
            ...parent,
            score: calculateScore(parent, goal)
          }));
          return { ...p, goal, roster: updatedRoster };
        }
        return p;
      })
    }));
  };

  const updateWishlistItem = (listName: 'wishlist' | 'uniqueWishlist', oldName: string, newItem: WishlistItem) => {
    setAppData(prevData => ({
      ...prevData,
      profiles: prevData.profiles.map(p => {
        if (p.id === prevData.activeProfileId) {
          const newGoal = { ...p.goal };
          const list = newGoal[listName] as WishlistItem[];
          const itemIndex = list.findIndex(i => i.name === oldName);
          if (itemIndex === -1) return p;

          list[itemIndex] = newItem;

          let newRoster = p.roster;
          if (oldName !== newItem.name) {
            const sparkListName = listName === 'wishlist' ? 'whiteSparks' : 'uniqueSparks';
            newRoster = p.roster.map(parent => ({
              ...parent,
              [sparkListName]: parent[sparkListName].map(spark => 
                spark.name === oldName ? { ...spark, name: newItem.name } : spark
              )
            }));
          }

          newRoster = newRoster.map(parent => ({
            ...parent,
            score: calculateScore(parent, newGoal)
          }));

          return { ...p, goal: newGoal, roster: newRoster };
        }
        return p;
      })
    }));
  };

  const getNextGenNumber = (): number => {
    const roster = getActiveProfile()?.roster ?? [];
    return roster.length > 0 ? Math.max(...roster.map(p => p.gen)) + 1 : 1;
  };

  const addParent = (parentData: NewParentData) => {
    const activeProfile = getActiveProfile();
    if (!activeProfile) return;

    const newParent: Parent = {
      ...parentData,
      id: Date.now(),
      gen: getNextGenNumber(),
      score: calculateScore(parentData, activeProfile.goal),
    };

    setAppData(prevData => ({
      ...prevData,
      profiles: prevData.profiles.map(p => 
        p.id === prevData.activeProfileId 
        ? { ...p, roster: [...p.roster, newParent] } 
        : p
      )
    }));
  };

  const updateParent = (parent: Parent) => {
    const activeProfile = getActiveProfile();
    if (!activeProfile) return;

    const updatedParent = {
      ...parent,
      score: calculateScore(parent, activeProfile.goal)
    };

    setAppData(prevData => ({
      ...prevData,
      profiles: prevData.profiles.map(p => 
        p.id === prevData.activeProfileId 
        ? { ...p, roster: p.roster.map(r => r.id === parent.id ? updatedParent : r) } 
        : p
      )
    }));
  };

  const deleteParent = (parentId: number) => {
    setAppData(prevData => ({
      ...prevData,
      profiles: prevData.profiles.map(p => 
        p.id === prevData.activeProfileId 
        ? { ...p, roster: p.roster.filter(r => r.id !== parentId) } 
        : p
      )
    }));
  };
  
  const value = {
    loading,
    appData,
    dataMode,
    setDataMode,
    masterSkillList,
    masterUmaList,
    getActiveProfile,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};