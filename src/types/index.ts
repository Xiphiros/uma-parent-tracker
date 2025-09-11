export interface Skill {
  id: string;
  name_jp: string;
  name_en: string;
  name_en_community?: string;
  type: 'unique' | 'normal';
  rarity?: number;
  groupId?: number;
  isGlobal: boolean;
}

export interface Uma {
  id: string; // This will now be the Outfit ID, e.g., "100101"
  characterId: string; // This will be the base character ID, e.g., "1001"
  name_jp: string;
  name_en: string;
  name_en_community?: string;
  image?: string;
  isGlobal: boolean;
}

export interface BlueSpark {
  type: 'Speed' | 'Stamina' | 'Power' | 'Guts' | 'Wit';
  stars: 1 | 2 | 3;
}

export interface PinkSpark {
  type: string;
  stars: 1 | 2 | 3;
}

export interface WhiteSpark {
  name: string;
  stars: 1 | 2 | 3;
}

export interface UniqueSpark {
  name: string;
  stars: 1 | 2 | 3;
}

export interface WishlistItem {
  name: string;
  tier: 'S' | 'A' | 'B' | 'C';
}

export interface Goal {
  primaryBlue: string[];
  primaryPink: string[];
  uniqueWishlist: WishlistItem[];
  wishlist: WishlistItem[];
}

export interface Parent {
  id: number;
  umaId: string; // The outfit ID, e.g., "100101"
  name: string; // The formatted name, e.g., "[Special Dreamer] Special Week"
  gen: number;
  blueSpark: BlueSpark;
  pinkSpark: PinkSpark;
  uniqueSparks: UniqueSpark[];
  whiteSparks: WhiteSpark[];
  score: number;
  server: 'jp' | 'global';
}

export type NewParentData = Omit<Parent, 'id' | 'score' | 'gen' | 'server'>;

export interface Profile {
  id: number;
  name: string;
  goal: Goal;
  roster: number[]; // Array of Parent IDs
  isPinned?: boolean;
}

export type IconName = 'default' | 'runner' | 'trophy' | 'book' | 'star' | 'heart' | 'bolt' | 'flame' | 'brain' | 'carrot' | 'horseshoe' | 'flag';

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: IconName;
  isCollapsed: boolean;
  profileIds: number[];
  isPinned?: boolean;
}

export interface AppData {
  version: 4;
  activeProfileId: number | null;
  activeServer: 'jp' | 'global';
  profiles: Profile[];
  inventory: Parent[];
  folders: Folder[];
  layout: (string | number)[]; // string for folderId, number for profileId
}