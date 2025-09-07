import { useState, useRef } from 'react';
import { WishlistItem, Skill } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useScrollLock } from '../../hooks/useScrollLock';

interface WishlistSectionProps {
  title: string;
  wishlist: WishlistItem[];
  skillList: Skill[];
  onAdd: (item: WishlistItem) => void;
  onRemove: (itemName: string) => void;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

const WishlistSection = ({ title, wishlist, skillList, onAdd, onRemove }: WishlistSectionProps) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedTier, setSelectedTier] = useState<'S' | 'A' | 'B' | 'C'>('S');
  const wishlistContainerRef = useRef<HTMLDivElement>(null);
  useScrollLock(wishlistContainerRef);

  const handleAdd = () => {
    if (selectedSkill) {
      onAdd({ name: selectedSkill.name_en, tier: selectedTier });
      setSelectedSkill(null);
    }
  };

  const sortedWishlist = [...wishlist].sort((a, b) => {
    const rankOrderA = WISH_RANK_ORDER[a.tier];
    const rankOrderB = WISH_RANK_ORDER[b.tier];
    if (rankOrderA < rankOrderB) return -1;
    if (rankOrderA > rankOrderB) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="border-t pt-4">
      <h3 className="form__section-title mb-2">{title}</h3>
      <div className="wishlist space-y-2 max-h-48 overflow-y-auto pr-2" ref={wishlistContainerRef}>
        {sortedWishlist.length > 0 ? (
          sortedWishlist.map(item => (
            <div key={item.name} className="wishlist__item">
              <span className="wishlist__item-text">{item.name} <span className="wishlist__item-rank">(Rank {item.tier})</span></span>
              <button onClick={() => onRemove(item.name)} className="wishlist__remove-btn">&times;</button>
            </div>
          ))
        ) : (
          <p className="card__placeholder-text">No wishlist items yet.</p>
        )}
      </div>
      <div className="mt-2 space-y-2">
        <SearchableSelect
          items={skillList}
          placeholder="Select skill..."
          value={selectedSkill?.name_en || null}
          onSelect={(item) => setSelectedSkill(item as Skill)}
        />
        <div className="flex justify-between items-center">
          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value as 'S' | 'A' | 'B' | 'C')}
            className="form__input w-32"
          >
            <option value="S">Rank S</option>
            <option value="A">Rank A</option>
            <option value="B">Rank B</option>
            <option value="C">Rank C</option>
          </select>
          <button onClick={handleAdd} className="button button--primary">Add</button>
        </div>
      </div>
    </div>
  );
};

export default WishlistSection;