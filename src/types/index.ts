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

/**
 * Represents the essential, scorable data of a parent that is not in the inventory (e.g., a rental).
 * White sparks are omitted as their influence is considered "baked into" the resulting child's white sparks.
 */
export interface ManualParentData {
  blueSpark: BlueSpark;
  pinkSpark: PinkSpark;
  uniqueSparks: UniqueSpark[];
}

/** A parent used for breeding can be an owned parent (referenced by ID) or a manually-entered one. */
export type Grandparent = number | ManualParentData;


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
  grandparent1?: Grandparent;
  grandparent2?: Grandparent;
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

export interface ServerSpecificData {
  activeProfileId: number | null;
  profiles: Profile[];
  folders: Folder[];
  layout: (string | number)[];
}

export interface AppData {
  version: 5;
  activeServer: 'jp' | 'global';
  inventory: Parent[];
  serverData: {
    jp: ServerSpecificData;
    global: ServerSpecificData;
  };
}

export interface ValidationResult {
    errors: string[];
}