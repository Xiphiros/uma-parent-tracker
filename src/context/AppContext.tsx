import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppData, Profile, Skill, Uma } from '../types';
import masterSkillListJson from '../data/skill-list.json';
import masterUmaListJson from '../data/uma-list.json';

const DB_KEY = 'umaTrackerData_v2';

interface AppContextType {
  loading: boolean;
  appData: AppData;
  masterSkillList: Skill[];
  masterUmaList: Uma[];
  getActiveProfile: () => Profile | undefined;
  saveState: (newData: AppData) => void;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  addProfile: (name: string) => void;
  switchProfile: (id: number) => void;
  renameProfile: (id: number, newName: string) => void;
  deleteProfile: (id: number) => void;
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
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [masterSkillList] = useState<Skill[]>(masterSkillListJson as Skill[]);
  const [masterUmaList] = useState<Uma[]>(masterUmaListJson as Uma[]);
  const [appData, setAppData] = useState<AppData>({
    version: 2,
    activeProfileId: null,
    profiles: [],
  });

  const isInitialLoad = useRef(true);

  useEffect(() => {
    const loadState = () => {
      let data: AppData | null = null;
      const savedData = localStorage.getItem(DB_KEY);

      if (savedData) {
        data = JSON.parse(savedData);
      }
      
      if (!data || data.profiles.length === 0) {
        const firstProfile = createNewProfile('My First Project');
        data = {
          version: 2,
          activeProfileId: firstProfile.id,
          profiles: [firstProfile],
        };
      }

      data.profiles.forEach(p => {
        if (!p.goal.uniqueWishlist) p.goal.uniqueWishlist = [];
        p.roster.forEach(parent => {
            if (!parent.uniqueSparks) parent.uniqueSparks = [];
        });
      });

      setAppData(data);
      setLoading(false);
    };

    loadState();
  }, []);
  
  useEffect(() => {
    if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
    }
    localStorage.setItem(DB_KEY, JSON.stringify(appData));
  }, [appData]);


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
          const data = JSON.parse(e.target?.result as string);
          if (!data.version || !data.profiles || !data.activeProfileId) {
            throw new Error("Invalid backup file format.");
          }
          setAppData(data);
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

  const addProfile = (name: string) => {
    const newProfile = createNewProfile(name);
    setAppData(prevData => ({
      ...prevData,
      activeProfileId: newProfile.id,
      profiles: [...prevData.profiles, newProfile],
    }));
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
      let newActiveId = prevData.activeProfileId;
      if (newActiveId === id) {
        newActiveId = newProfiles.length > 0 ? newProfiles[0].id : null;
      }
      return { ...prevData, profiles: newProfiles, activeProfileId: newActiveId };
    });
  };
  
  const value = {
    loading,
    appData,
    masterSkillList,
    masterUmaList,
    getActiveProfile,
    saveState,
    exportData,
    importData,
    addProfile,
    switchProfile,
    renameProfile,
    deleteProfile
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};