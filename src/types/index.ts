export interface Skill {
  id: string;
  name_jp: string;
  name_en: string;
  type: 'unique' | 'normal';
}

export interface Uma {
  id: string;
  name_en: string;
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
  name: string;
  gen: number;
  blueSpark: BlueSpark;
  pinkSpark: PinkSpark;
  uniqueSparks: UniqueSpark[];
  whiteSparks: WhiteSpark[];
  score: number;
}

export interface Profile {
  id: number;
  name: string;
  goal: Goal;
  roster: Parent[];
}

export interface AppData {
  version: 2;
  activeProfileId: number | null;
  profiles: Profile[];
}