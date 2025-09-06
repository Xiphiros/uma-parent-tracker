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
      
      // Note: V1 migration logic from original app.js would go here if needed.
      // For this implementation, we'll assume a fresh start or V2 data.

      if (!data || data.profiles.length === 0) {
        const firstProfile = createNewProfile('My First Project');
        data = {
          version: 2,
          activeProfileId: firstProfile.id,
          profiles: [firstProfile],
        };
      }

      // Schema migration from old versions if necessary
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
  
  const value = {
    loading,
    appData,
    masterSkillList,
    masterUmaList,
    getActiveProfile,
    saveState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};