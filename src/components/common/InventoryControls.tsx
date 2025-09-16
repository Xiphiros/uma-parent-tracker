import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill, Filters } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext } from '../../context/AppContext';
import './InventoryControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import RangeSlider from './RangeSlider';

export type SortByType = 'score' | 'name' | 'gen' | 'id' | 'sparks';

interface InventoryControlsProps {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    sortBy: SortByType;
    setSortBy: (value: SortByType) => void;
}

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];

const InventoryControls = ({ filters, setFilters, sortBy, setSortBy }: InventoryControlsProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { masterSkillList, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [isAdvanced, setIsAdvanced] = useState(true);

    const uniqueSkills = masterSkillList.filter(s => s.type === 'unique');
    const normalSkills = masterSkillList.filter(s => s.type !== 'unique' && s.rarity === 1);

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSparkFilterChange = (sparkType: 'blueSpark' | 'pinkSpark' | 'uniqueSpark' | 'whiteSpark', part: 'type' | 'stars' | 'name', value: string | number) => {
        setFilters(prev => ({
            ...prev,
            [sparkType]: { ...prev[sparkType], [part]: value }
        }));
    };

    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            searchScope: 'total',
            blueSpark: { type: 'all', stars: 0 },
            pinkSpark: { type: 'all', stars: 0 },
            uniqueSpark: { name: '', stars: 0 },
            whiteSpark: { name: '', stars: 0 },
            minWhiteSparks: 0,
        });
    };

    const renderStarFilter = (sparkType: 'blueSpark' | 'pinkSpark' | 'whiteSpark' | 'uniqueSpark', maxStars: number) => {
        const key = sparkType as keyof Filters;
        const value = (filters[key] as { stars: number }).stars;

        if (filters.searchScope === 'representative') {
            return (
                <select className="form__input" value={value} onChange={(e) => handleSparkFilterChange(key, 'stars', Number(e.target.value))}>
                    {[0, 1, 2, 3].map(s => <option key={s} value={s}>{s === 0 ? t('inventory.anyStars') : `${s}+`}</option>)}
                </select>
            );
        }
        return (
            <RangeSlider label="" min={0} max={maxStars} value={value} onChange={(v) => handleSparkFilterChange(key, 'stars', v)} />
        );
    };

    return (
        <div className="inventory-controls">
            <div className="inventory-controls__grid">
                <div className="inventory-controls__main">
                    <div className="flex gap-4">
                        <div className="inventory-controls__group flex-grow">
                            <label className="inventory-controls__label">{t('inventory.searchByName')}</label>
                            <input type="text" className="form__input" value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} />
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
                    <div className="flex justify-between items-end flex-grow">
                        <button className="button button--neutral button--small" onClick={clearFilters}><FontAwesomeIcon icon={faTimes} className="mr-2" /> {t('inventory.clearFilters')}</button>
                        <button className="button button--secondary button--small" onClick={() => setIsAdvanced(!isAdvanced)}><FontAwesomeIcon icon={faFilter} className="mr-2" /> {isAdvanced ? t('inventory.hideAdvanced') : t('inventory.showAdvanced')}</button>
                    </div>
                </div>
                {isAdvanced && (
                    <div className="inventory-controls__advanced-panel">
                        <div>
                            <label className="inventory-controls__label mb-1">{t('inventory.searchScope')}</label>
                            <div className="inventory-controls__scope-toggle">
                                <button className={`inventory-controls__scope-btn ${filters.searchScope === 'total' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => handleFilterChange('searchScope', 'total')}>{t('inventory.scope.total')}</button>
                                <button className={`inventory-controls__scope-btn ${filters.searchScope === 'representative' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => handleFilterChange('searchScope', 'representative')}>{t('inventory.scope.representative')}</button>
                            </div>
                        </div>
                        <div className="inventory-controls__group">
                            <label className="inventory-controls__label">{t('inventory.minWhiteSkills')}</label>
                            <input type="number" className="form__input" min="0" value={filters.minWhiteSparks} onChange={e => handleFilterChange('minWhiteSparks', Math.max(0, parseInt(e.target.value, 10)) || 0)} />
                        </div>
                        <div className="inventory-controls__group">
                            <label className="inventory-controls__label">{t('inventory.blueSpark')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <select className="form__input" value={filters.blueSpark.type} onChange={(e) => handleSparkFilterChange('blueSpark', 'type', e.target.value)}>
                                    <option value="all">{t('inventory.allTypes')}</option>
                                    {BLUE_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                                </select>
                                {renderStarFilter('blueSpark', 9)}
                            </div>
                        </div>
                        <div className="inventory-controls__group">
                            <label className="inventory-controls__label">{t('inventory.pinkSpark')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <select className="form__input" value={filters.pinkSpark.type} onChange={(e) => handleSparkFilterChange('pinkSpark', 'type', e.target.value)}>
                                    <option value="all">{t('inventory.allTypes')}</option>
                                    {PINK_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                                </select>
                                {renderStarFilter('pinkSpark', 9)}
                            </div>
                        </div>
                         <div className="inventory-controls__group">
                            <label className="inventory-controls__label">{t('inventory.uniqueSpark')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <SearchableSelect items={uniqueSkills} placeholder={t('common:selectPlaceholder')} value={filters.uniqueSpark.name ? masterSkillList.find(s => s.name_en === filters.uniqueSpark.name)?.[displayNameProp] || null : null} onSelect={(item) => handleSparkFilterChange('uniqueSpark', 'name', (item as Skill).name_en)} />
                                {renderStarFilter('uniqueSpark', 3)}
                            </div>
                        </div>
                         <div className="inventory-controls__group">
                            <label className="inventory-controls__label">{t('inventory.whiteSpark')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <SearchableSelect items={normalSkills} placeholder={t('common:selectPlaceholder')} value={filters.whiteSpark.name ? masterSkillList.find(s => s.name_en === filters.whiteSpark.name)?.[displayNameProp] || null : null} onSelect={(item) => handleSparkFilterChange('whiteSpark', 'name', (item as Skill).name_en)} />
                                {renderStarFilter('whiteSpark', 9)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryControls;