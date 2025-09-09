import { useState, useRef } from 'react';
import { WishlistItem, Skill } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useScrollLock } from '../../hooks/useScrollLock';
import './WishlistSection.css';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface WishlistSectionProps {
  title: string;
  wishlist: WishlistItem[];
  skillList: Skill[];
  onAdd: (item: WishlistItem) => void;
  onRemove: (itemName: string) => void;
  onUpdate: (oldName: string, newItem: WishlistItem) => void;
  disableAdd?: boolean;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };
const TIER_OPTIONS: WishlistItem['tier'][] = ['S', 'A', 'B', 'C'];

const WishlistSection = ({ title, wishlist, skillList, onAdd, onRemove, onUpdate, disableAdd = false }: WishlistSectionProps) => {
  const { t } = useTranslation(['goal', 'common']);
  const { dataDisplayLanguage, skillMapByName } = useAppContext();
  const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
  
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedTier, setSelectedTier] = useState<WishlistItem['tier']>('S');
  const wishlistContainerRef = useRef<HTMLDivElement>(null);
  useScrollLock(wishlistContainerRef);

  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<WishlistItem['tier']>('S');

  const handleAdd = () => {
    if (selectedSkill) {
      onAdd({ name: selectedSkill.name_en, tier: selectedTier });
      setSelectedSkill(null);
    }
  };
  
  const handleEditClick = (item: WishlistItem) => {
    setEditingItemName(item.name);
    setEditingTier(item.tier);
  };

  const handleCancelEdit = () => {
    setEditingItemName(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemName) return;
    
    onUpdate(editingItemName, { name: editingItemName, tier: editingTier });
    setEditingItemName(null);
  };

  const sortedWishlist = [...wishlist].sort((a, b) => {
    const rankOrderA = WISH_RANK_ORDER[a.tier];
    const rankOrderB = WISH_RANK_ORDER[b.tier];
    if (rankOrderA < rankOrderB) return -1;
    if (rankOrderA > rankOrderB) return 1;
    return a.name.localeCompare(b.name);
  });
  
  const getDisplayName = (name_en: string) => {
      const skill = skillMapByName.get(name_en);
      return skill ? skill[displayNameProp] : name_en;
  };

  return (
    <div className="border-t pt-4">
      <h3 className="form__section-title mb-2">{title}</h3>
      <div className="wishlist space-y-2 max-h-48 overflow-y-auto pr-2" ref={wishlistContainerRef}>
        {sortedWishlist.length > 0 ? (
          sortedWishlist.map(item => (
            <div key={item.name} className="wishlist-manage__item">
              {editingItemName === item.name ? (
                <form className="wishlist-manage__edit-form" onSubmit={handleSaveEdit}>
                  <span className="wishlist-manage__item-info flex-grow">{getDisplayName(item.name)}</span>
                  <select 
                    className="form__input w-28"
                    value={editingTier}
                    onChange={e => setEditingTier(e.target.value as WishlistItem['tier'])}
                  >
                    {TIER_OPTIONS.map(t => <option key={t} value={t}>{t('wishlist.rank')} {t}</option>)}
                  </select>
                  <div className="wishlist-manage__item-actions">
                    <button type="submit" className="parent-card__edit-btn">{t('wishlist.save')}</button>
                    <button type="button" onClick={handleCancelEdit} className="parent-card__delete-btn">{t('wishlist.cancel')}</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="wishlist-manage__item-info">
                    <span>{getDisplayName(item.name)}</span>
                    <span className="wishlist-manage__item-rank">{t('wishlist.rank')} {item.tier}</span>
                  </div>
                  <div className="wishlist-manage__item-actions">
                    <button onClick={() => handleEditClick(item)} className="parent-card__edit-btn">{t('common:edit')}</button>
                    <button onClick={() => onRemove(item.name)} className="parent-card__delete-btn">{t('common:delete')}</button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="card__placeholder-text">{t('wishlist.noItems')}</p>
        )}
      </div>
      <div className="mt-2 space-y-2">
        <SearchableSelect
          items={skillList}
          placeholder={t('wishlist.selectSkill')}
          value={selectedSkill?.[displayNameProp] || null}
          onSelect={(item) => setSelectedSkill(item as Skill)}
          displayProp={displayNameProp}
          disabled={disableAdd}
        />
        <div className="flex justify-between items-center">
          <select
            value={selectedTier}
            onChange={e => setSelectedTier(e.target.value as WishlistItem['tier'])}
            className="form__input w-32"
            disabled={disableAdd}
          >
            {TIER_OPTIONS.map(t => <option key={t} value={t}>{t('wishlist.rank')} {t}</option>)}
          </select>
          <button onClick={handleAdd} className="button button--primary" disabled={disableAdd || !selectedSkill}>{t('common:add')}</button>
        </div>
      </div>
    </div>
  );
};

export default WishlistSection;