import React from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext } from '../../context/AppContext';
import './InventoryControls.css';

export type SortByType = 'score' | 'name' | 'gen' | 'id' | 'sparks';
export interface Filters {
    searchTerm: string;
    blueSpark: { type: string; stars: number };
    pinkSpark: { type: string; stars: number };
    uniqueSpark: string;
    whiteSpark: string;
}

interface InventoryControlsProps {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    sortBy: SortByType;
    setSortBy: (value: SortByType) => void;
}

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];
const STAR_OPTIONS: number[] =;

const InventoryControls = ({ filters, setFilters, sortBy, setSortBy }: InventoryControlsProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { masterSkillList, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const uniqueSkills = masterSkillList.filter(s => s.type === 'unique');
    const normalSkills = masterSkillList.filter(s => s.type !== 'unique' && s.rarity === 1);

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSparkFilterChange = (sparkType: 'blueSpark' | 'pinkSpark', part: 'type' | 'stars', value: string | number) => {
        setFilters(prev => ({
            ...prev,
            [sparkType]: { ...prev[sparkType], [part]: value }
        }));
    };
    
    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            blueSpark: { type: 'all', stars: 0 },
            pinkSpark: { type: 'all', stars: 0 },
            uniqueSpark: '',
            whiteSpark: '',
        });
    };

    return (
        <div className="inventory-controls">
            <div className="inventory-controls__grid">
                <div className="inventory-controls__main-actions">
                    <div className="inventory-controls__group flex-grow">
                        <label className="inventory-controls__label">{t('inventory.searchByName')}</label>
                        <input
                            type="text"
                            className="form__input"
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        />
                    </div>
                     <div className="inventory-controls__group">
                        <label className="inventory-controls__label">{t('inventory.sortBy')}</label>
                        <select className="form__input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortByType)}>
                            <option value="score">{t('inventory.sortOptions.score')}</option>
                            <option value="name">{t('inventory.sortOptions.name')}</option>
                            <option value="gen">{t('inventory.sortOptions.gen')}</option>
                            <option value="id">{t('inventory.sortOptions.date')}</option>
                            <option value="sparks">{t('inventory.sortOptions.sparks')}</option>
                        </select>
                    </div>
                </div>

                <div className="inventory-controls__filters">
                    <div className="inventory-controls__group">
                        <label className="inventory-controls__label">{t('inventory.blueSpark')}</label>
                        <div className="flex gap-2">
                             <select className="form__input" value={filters.blueSpark.type} onChange={(e) => handleSparkFilterChange('blueSpark', 'type', e.target.value)}>
                                <option value="all">{t('inventory.allTypes')}</option>
                                {BLUE_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                            </select>
                            <select className="form__input w-28" value={filters.blueSpark.stars} onChange={(e) => handleSparkFilterChange('blueSpark', 'stars', Number(e.target.value))}>
                                {STAR_OPTIONS.map(s => <option key={s} value={s}>{s === 0 ? t('inventory.anyStars') : `${s}+`}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="inventory-controls__group">
                        <label className="inventory-controls__label">{t('inventory.pinkSpark')}</label>
                         <div className="flex gap-2">
                             <select className="form__input" value={filters.pinkSpark.type} onChange={(e) => handleSparkFilterChange('pinkSpark', 'type', e.target.value)}>
                                <option value="all">{t('inventory.allTypes')}</option>
                                {PINK_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                            </select>
                            <select className="form__input w-28" value={filters.pinkSpark.stars} onChange={(e) => handleSparkFilterChange('pinkSpark', 'stars', Number(e.target.value))}>
                                {STAR_OPTIONS.map(s => <option key={s} value={s}>{s === 0 ? t('inventory.anyStars') : `${s}+`}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="inventory-controls__group">
                        <label className="inventory-controls__label">{t('inventory.uniqueSpark')}</label>
                        <SearchableSelect items={uniqueSkills} placeholder={t('common:selectPlaceholder')} value={filters.uniqueSpark ? masterSkillList.find(s => s.name_en === filters.uniqueSpark)?.[displayNameProp] || null : null} onSelect={(item) => handleFilterChange('uniqueSpark', (item as Skill).name_en)} />
                    </div>
                     <div className="inventory-controls__group">
                        <label className="inventory-controls__label">{t('inventory.whiteSpark')}</label>
                        <SearchableSelect items={normalSkills} placeholder={t('common:selectPlaceholder')} value={filters.whiteSpark ? masterSkillList.find(s => s.name_en === filters.whiteSpark)?.[displayNameProp] || null : null} onSelect={(item) => handleFilterChange('whiteSpark', (item as Skill).name_en)} />
                    </div>
                </div>
            </div>
             <div className="flex justify-end mt-4">
                <button className="button button--neutral" onClick={clearFilters}>{t('inventory.clearFilters')}</button>
            </div>
        </div>
    );
};

export default InventoryControls;