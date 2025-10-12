import { SortDirectionType, SortFieldType, InventoryViewType } from "../components/common/InventoryControls";

export interface SkillRarity {
  rarity: 1 | 2 | 3;
  factorId: number;
}

export interface Skill {
  id: number; // factor_group_id
  factorId: number; // The 1-star factor ID
  factorType: number; // The original factor_type from the database
  name_jp: string;
  name_en: string;
  description_jp: string | null;
  description_en: string | null;
  category: 'blue' | 'pink' | 'unique' | 'white';
  rarities: SkillRarity[];
  isGlobal: boolean;
  
  // Data for the skill this factor represents
  activeSkillId: number | null;
  purchasableSkillId: number | null;
  sp_cost?: number;
  name_jp_skill?: string;
  name_en_skill?: string;
  description_jp_skill?: string;
  description_en_skill?: string;
}

export interface Uma {
  id: string; // This is the Outfit ID, e.g., "100101"
  characterId: string; // This is the base character ID, e.g., "1001"
  base_name_jp: string;
  base_name_en: string;
  outfit_name_jp: string;
  outfit_name_en: string;
  image?: string;
  isGlobal: boolean;
  activeUniqueSkillId: number | null;
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
  secondaryBlue: string[];
  primaryPink: string[];
  uniqueWishlist: WishlistItem[];
  wishlist: WishlistItem[];
}

/**
 * Represents the essential, scorable data of a parent that is not in the inventory (e.g., a rental).
 */
export interface ManualParentData {
  umaId?: string;
  blueSpark: BlueSpark;
  pinkSpark: PinkSpark;
  uniqueSparks: UniqueSpark[];
  whiteSparks: WhiteSpark[];
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
  hash?: string;
  isBorrowed?: boolean;
}

export type NewParentData = Omit<Parent, 'id' | 'score' | 'gen' | 'server'>;

export interface Profile {
  id: number;
  name: string;
  goal: Goal;
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

export interface SkillPreset {
  id: string;
  name: string;
  skillIds: number[];
}

export interface AppData {
  version: number;
  activeServer: 'jp' | 'global';
  inventory: Parent[];
  skillPresets: SkillPreset[];
  serverData: {
    jp: ServerSpecificData;
    global: ServerSpecificData;
  };
}

export interface ValidationResult {
    errors: string[];
}

export interface BreedingPair {
    p1: Parent;
    p2: Parent;
}

export interface LineageStats {
    blue: Record<string, number>;
    pink: Record<string, number>;
    unique: Record<string, number>;
    white: Record<string, number>;
    whiteSkillCount: number;
}

export interface BlueSparkFilter { type: string; stars: number }
export interface PinkSparkFilter { type: string; stars: number }
export interface UniqueSparkFilter { name: string; stars: number }
export interface WhiteSparkFilter { name: string; stars: number }


export interface Filters {
    searchTerm: string;
    searchScope: 'representative' | 'total';
    blueSparks: BlueSparkFilter[];
    pinkSparks: PinkSparkFilter[];
    uniqueSparks: UniqueSparkFilter[];
    whiteSparks: WhiteSparkFilter[];
    minWhiteSparks: number;
}

// --- Worker Types ---
export interface LegacyImportWorkerPayload {
    legacyData: any;
    skillList: Skill[];
    umaList: Uma[];
}

export type LegacyImportWorkerResponse = 
    | { type: 'success'; data: AppData }
    | { type: 'error'; message: string };

// --- Roster Worker Types ---
export interface RosterWorkerData {
    inventory: Parent[];
    skillMapEntries: [string, Skill][];
    umaMapEntries: [string, Uma][];
    activeServer: 'jp' | 'global';
}

export interface RosterWorkerUpdatePayload {
    goal: Goal;
    filters: Filters;
    sortField: SortFieldType;
    sortDirection: SortDirectionType;
    inventoryView: InventoryViewType;
}

export type RosterWorkerPayload = 
    | { type: 'INIT'; data: RosterWorkerData }
    | { type: 'UPDATE'; data: RosterWorkerUpdatePayload };

export interface BreedingPairWithStats extends BreedingPair {
    avgFinalScore: number;
    avgIndividualScore: number;
    totalSparks: number;
    uniqueSparks: number;
}

export interface RosterWorkerResponse {
    sortedParentIds: number[];
    topBreedingPairs: Record<'owned' | 'borrowed', BreedingPairWithStats[]>;
}