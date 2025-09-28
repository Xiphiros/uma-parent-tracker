import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill, Filters } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext } from '../../context/AppContext';
import './InventoryControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes, faArrowDownWideShort, faArrowUpShortWide, faPlus } from '@fortawesome/free-solid-svg-icons';
import RangeSlider from './RangeSlider';

export type SortFieldType = 'score' | 'individualScore' | 'name' | 'gen' | 'id' | 'sparks';
export type SortDirectionType = 'asc' | 'desc';
export type InventoryViewType = 'all' | 'owned' | 'borrowed';

type SparkFilterType = 'blueSparks' | 'pinkSparks' | 'uniqueSparks' | 'whiteSparks';

interface InventoryControlsProps {
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    sortField: SortFieldType;
    setSortField: (value: SortFieldType) => void;
    sortDirection: SortDirectionType;
    setSortDirection: (value: SortDirectionType) => void;
    inventoryView: InventoryViewType;
    setInventoryView: (value: InventoryViewType) => void;
}

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];

const InventoryControls = ({ filters, setFilters, sortField, setSortField, sortDirection, setSortDirection, inventoryView, setInventoryView }: InventoryControlsProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { masterSkillList, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [isAdvanced, setIsAdvanced] = useState(true);

    const uniqueSkills = masterSkillList.filter(s => s.category === 'unique');
    const normalSkills = masterSkillList.filter(s => s.category === 'white');

    // When switching to representative mode, clamp any existing star filters to the max of 3.
    useEffect(() => {
        if (filters.searchScope === 'representative') {
            setFilters(prev => ({
                ...prev,
                blueSparks: prev.blueSparks.map(f => ({ ...f, stars: Math.min(f.stars, 3) })),
                pinkSparks: prev.pinkSparks.map(f => ({ ...f, stars: Math.min(f.stars, 3) })),
                uniqueSparks: prev.uniqueSparks.map(f => ({ ...f, stars: Math.min(f.stars, 3) })),
                whiteSparks: prev.whiteSparks.map(f => ({ ...f, stars: Math.min(f.stars, 3) }))
            }));
        }
    }, [filters.searchScope, setFilters]);

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    
    const handleAddSparkFilter = (type: SparkFilterType) => {
        setFilters(prev => {
            const newFilters = [...prev[type]];
            let newItem;
            if (type === 'blueSparks') newItem = { type: 'Speed', stars: 0 };
            else if (type === 'pinkSparks') newItem = { type: 'Mile', stars: 0 };
            else newItem = { name: '', stars: 0 };
            newFilters.push(newItem as any);
            return { ...prev, [type]: newFilters };
        });
    };
    
    const handleRemoveSparkFilter = (type: SparkFilterType, index: number) => {
        setFilters(prev => {
            const newFilters = [...prev[type]];
            newFilters.splice(index, 1);
            return { ...prev, [type]: newFilters };
        });
    };
    
    const handleUpdateSparkFilter = (type: SparkFilterType, index: number, field: 'type' | 'name' | 'stars', value: any) => {
         setFilters(prev => {
            const newFilters = [...prev[type]];
            const updatedItem = { ...newFilters[index], [field]: value };
            newFilters[index] = updatedItem;
            return { ...prev, [type]: newFilters };
        });
    };

    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };

    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            searchScope: 'total',
            blueSparks: [],
            pinkSparks: [],
            uniqueSparks: [],
            whiteSparks: [],
            minWhiteSparks: 0,
        });
    };

    const renderStarFilter = (value: number, onChange: (value: number) => void, maxStars: number) => {
        const sliderMax = filters.searchScope === 'representative' ? 3 : maxStars;
        
        return (
            <div className="inventory-controls__star-filter-wrapper">
                <RangeSlider label="" min={0} max={sliderMax} value={value} onChange={onChange} />
            </div>
        );
    };

    return (
        <div className="inventory-controls">
            <div className="inventory-controls__main">
                <div className="inventory-controls__group">
                    <div className="inventory-controls__scope-toggle">
                        <button className={`inventory-controls__scope-btn ${inventoryView === 'all' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('all')}>{t('inventory.view.all')}</button>
                        <button className={`inventory-controls__scope-btn ${inventoryView === 'owned' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('owned')}>{t('inventory.view.owned')}</button>
                        <button className={`inventory-controls__scope-btn ${inventoryView === 'borrowed' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('borrowed')}>{t('inventory.view.borrowed')}</button>
                    </div>
                </div>
                 <div className="flex gap-4">
                    <div className="inventory-controls__group flex-grow">
                        <label className="inventory-controls__label">{t('inventory.searchByName')}</label>
                        <input type="text" className="form__input" value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} />
                    </div>
                    <div className="inventory-controls__group">
                        <label className="inventory-controls__label">{t('inventory.sortBy')}</label>
                        <div className="flex gap-2">
                             <select className="form__input" value={sortField} onChange={(e) => setSortField(e.target.value as SortFieldType)}>
                                <option value="score">{t('inventory.sortOptions.finalScore')}</option>
                                <option value="individualScore">{t('inventory.sortOptions.individualScore')}</option>
                                <option value="name">{t('inventory.sortOptions.name')}</option>
                                <option value="gen">{t('inventory.sortOptions.gen')}</option>
                                <option value="id">{t('inventory.sortOptions.date')}</option>
                                <option value="sparks">{t('inventory.sortOptions.sparks')}</option>
                            </select>
                             <button className="button button--secondary flex-shrink-0" onClick={toggleSortDirection} title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}>
                                <FontAwesomeIcon icon={sortDirection === 'desc' ? faArrowDownWideShort : faArrowUpShortWide} />
                            </button>
                        </div>
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

                    {/* Blue Sparks */}
                    <div className="inventory-controls__group">
                        <div className="inventory-controls__filter-header">
                            <label className="inventory-controls__label">{t('inventory.blueSpark')}</label>
                            <button className="inventory-controls__add-btn" onClick={() => handleAddSparkFilter('blueSparks')} disabled={filters.blueSparks.length >= 3}><FontAwesomeIcon icon={faPlus} /></button>
                        </div>
                        {filters.blueSparks.map((filter, index) => (
                            <div key={index} className="inventory-controls__filter-row">
                                <select className="form__input" value={filter.type} onChange={(e) => handleUpdateSparkFilter('blueSparks', index, 'type', e.target.value)}>
                                    {BLUE_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                                </select>
                                {renderStarFilter(filter.stars, (v) => handleUpdateSparkFilter('blueSparks', index, 'stars', v), 9)}
                                <button className="inventory-controls__remove-btn" onClick={() => handleRemoveSparkFilter('blueSparks', index)}><FontAwesomeIcon icon={faTimes} /></button>
                            </div>
                        ))}
                    </div>

                    {/* Pink Sparks */}
                    <div className="inventory-controls__group">
                        <div className="inventory-controls__filter-header">
                            <label className="inventory-controls__label">{t('inventory.pinkSpark')}</label>
                            <button className="inventory-controls__add-btn" onClick={() => handleAddSparkFilter('pinkSparks')} disabled={filters.pinkSparks.length >= 3}><FontAwesomeIcon icon={faPlus} /></button>
                        </div>
                        {filters.pinkSparks.map((filter, index) => (
                            <div key={index} className="inventory-controls__filter-row">
                                <select className="form__input" value={filter.type} onChange={(e) => handleUpdateSparkFilter('pinkSparks', index, 'type', e.target.value)}>
                                    {PINK_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                                </select>
                                {renderStarFilter(filter.stars, (v) => handleUpdateSparkFilter('pinkSparks', index, 'stars', v), 9)}
                                <button className="inventory-controls__remove-btn" onClick={() => handleRemoveSparkFilter('pinkSparks', index)}><FontAwesomeIcon icon={faTimes} /></button>
                            </div>
                        ))}
                    </div>

                    {/* Unique Sparks */}
                    <div className="inventory-controls__group">
                         <div className="inventory-controls__filter-header">
                            <label className="inventory-controls__label">{t('inventory.uniqueSpark')}</label>
                            <button className="inventory-controls__add-btn" onClick={() => handleAddSparkFilter('uniqueSparks')} disabled={filters.uniqueSparks.length >= 6}><FontAwesomeIcon icon={faPlus} /></button>
                        </div>
                        {filters.uniqueSparks.map((filter, index) => (
                            <div key={index} className="inventory-controls__filter-row">
                                <SearchableSelect items={uniqueSkills} placeholder={t('common:selectPlaceholder')} value={filter.name ? masterSkillList.find(s => s.name_en === filter.name)?.[displayNameProp] || null : null} onSelect={(item) => handleUpdateSparkFilter('uniqueSparks', index, 'name', (item as Skill).name_en)} />
                                {renderStarFilter(filter.stars, (v) => handleUpdateSparkFilter('uniqueSparks', index, 'stars', v), 3)}
                                <button className="inventory-controls__remove-btn" onClick={() => handleRemoveSparkFilter('uniqueSparks', index)}><FontAwesomeIcon icon={faTimes} /></button>
                            </div>
                        ))}
                    </div>

                    {/* White Sparks */}
                    <div className="inventory-controls__group">
                         <div className="inventory-controls__filter-header">
                            <label className="inventory-controls__label">{t('inventory.whiteSpark')}</label>
                            <button className="inventory-controls__add-btn" onClick={() => handleAddSparkFilter('whiteSparks')}><FontAwesomeIcon icon={faPlus} /></button>
                        </div>
                        {filters.whiteSparks.map((filter, index) => (
                            <div key={index} className="inventory-controls__filter-row">
                                <SearchableSelect items={normalSkills} placeholder={t('common:selectPlaceholder')} value={filter.name ? masterSkillList.find(s => s.name_en === filter.name)?.[displayNameProp] || null : null} onSelect={(item) => handleUpdateSparkFilter('whiteSparks', index, 'name', (item as Skill).name_en)} />
                                {renderStarFilter(filter.stars, (v) => handleUpdateSparkFilter('whiteSparks', index, 'stars', v), 9)}
                                <button className="inventory-controls__remove-btn" onClick={() => handleRemoveSparkFilter('whiteSparks', index)}><FontAwesomeIcon icon={faTimes} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryControls;