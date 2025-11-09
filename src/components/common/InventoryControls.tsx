import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill, Filters, SortFieldType } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext } from '../../context/AppContext';
import './InventoryControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes, faArrowDownWideShort, faArrowUpShortWide, faPlus } from '@fortawesome/free-solid-svg-icons';
import RangeSlider from './RangeSlider';
import { useDebounce } from '../../hooks/useDebounce';
import { initialFilters } from '../../context/AppContext';

interface InventoryControlsProps {}

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];

type SparkGroupType = 'blueSparkGroups' | 'pinkSparkGroups' | 'uniqueSparkGroups' | 'whiteSparkGroups' | 'lineageSparkGroups';

const InventoryControls = ({}: InventoryControlsProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { 
        masterSkillList, dataDisplayLanguage,
        filters, setFilters, sortField, setSortField, 
        sortDirection, setSortDirection, inventoryView, setInventoryView
    } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [isAdvanced, setIsAdvanced] = useState(true);
    const [liveSearchTerm, setLiveSearchTerm] = useState(filters.searchTerm);
    const debouncedSearchTerm = useDebounce(liveSearchTerm, 300);

    useEffect(() => {
        setFilters(prev => ({ ...prev, searchTerm: debouncedSearchTerm }));
    }, [debouncedSearchTerm, setFilters]);
    
    useEffect(() => {
        if (filters.searchTerm === '') {
            setLiveSearchTerm('');
        }
    }, [filters.searchTerm]);

    const uniqueSkills = masterSkillList.filter(s => s.category === 'unique');
    const normalSkills = masterSkillList.filter(s => s.category === 'white');

    useEffect(() => {
        if (filters.searchScope === 'representative') {
            const clampGroup = (group: any[]) => group.map(f => ({ ...f, stars: Math.min(f.stars, 3) }));
            setFilters(prev => ({
                ...prev,
                blueSparkGroups: prev.blueSparkGroups.map(clampGroup),
                pinkSparkGroups: prev.pinkSparkGroups.map(clampGroup),
                uniqueSparkGroups: prev.uniqueSparkGroups.map(clampGroup),
                whiteSparkGroups: prev.whiteSparkGroups.map(clampGroup),
            }));
        }
    }, [filters.searchScope, setFilters]);

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    
    const handleAddGroup = (type: SparkGroupType) => {
        setFilters(prev => {
            const newGroups = [...prev[type]];
            let newCondition;
            if (type === 'blueSparkGroups') newCondition = { type: 'Speed', stars: 0 };
            else if (type === 'pinkSparkGroups') newCondition = { type: 'Mile', stars: 0 };
            else newCondition = { name: '', stars: 0 };
            newGroups.push([newCondition as any]);
            return { ...prev, [type]: newGroups };
        });
    };

    const handleRemoveGroup = (type: SparkGroupType, groupIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev[type]];
            newGroups.splice(groupIndex, 1);
            return { ...prev, [type]: newGroups };
        });
    };

    const handleAddCondition = (type: SparkGroupType, groupIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev[type]];
            let newCondition;
            if (type === 'blueSparkGroups') newCondition = { type: 'Speed', stars: 0 };
            else if (type === 'pinkSparkGroups') newCondition = { type: 'Mile', stars: 0 };
            else newCondition = { name: '', stars: 0 };
            newGroups[groupIndex] = [...newGroups[groupIndex], newCondition] as any;
            return { ...prev, [type]: newGroups };
        });
    };

    const handleRemoveCondition = (type: SparkGroupType, groupIndex: number, conditionIndex: number) => {
        setFilters(prev => {
            let newGroups = [...prev[type]];
            if (newGroups[groupIndex].length === 1) {
                newGroups.splice(groupIndex, 1);
            } else {
                const newGroup = [...newGroups[groupIndex]];
                newGroup.splice(conditionIndex, 1);
                newGroups[groupIndex] = newGroup as any;
            }
            return { ...prev, [type]: newGroups };
        });
    };

    const handleUpdateCondition = (type: SparkGroupType, groupIndex: number, conditionIndex: number, field: 'type' | 'name' | 'stars', value: any) => {
         setFilters(prev => {
            const newGroups = [...prev[type]];
            const newGroup = [...newGroups[groupIndex]];
            newGroup[conditionIndex] = { ...newGroup[conditionIndex], [field]: value };
            newGroups[groupIndex] = newGroup as any;
            return { ...prev, [type]: newGroups };
        });
    };

    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };

    const clearFilters = () => {
        setLiveSearchTerm('');
        setFilters(initialFilters);
    };

    const renderStarFilter = (value: number, onChange: (value: number) => void, maxStars: number) => {
        const sliderMax = filters.searchScope === 'representative' ? 3 : maxStars;
        return <RangeSlider label="" min={0} max={sliderMax} value={value} onChange={onChange} />;
    };

    const renderGroupedFilters = (
        type: SparkGroupType, 
        label: string, 
        options: any[] | null, 
        displayField: 'type' | 'name', 
        maxStars: number, 
        maxGroups: number = Infinity
    ) => (
        <div className="inventory-controls__group">
            <div className="inventory-controls__filter-header">
                <label className="inventory-controls__label">{label}</label>
                <button 
                    className="inventory-controls__add-btn" 
                    onClick={() => handleAddGroup(type)} 
                    disabled={filters[type].length >= maxGroups}
                    title={t('inventory.addGroupTooltip')}
                >
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>
            <div className="flex flex-col gap-3">
                {(filters[type] as any[][]).map((group, groupIndex) => (
                    <div key={groupIndex} className="inventory-controls__filter-group">
                        <div className="inventory-controls__group-header">
                            <span className="inventory-controls__group-title">{t('inventory.matchAny')}</span>
                            <button className="button button--danger button--small" onClick={() => handleRemoveGroup(type, groupIndex)}>{t('inventory.removeGroup')}</button>
                        </div>
                        <div className="inventory-controls__group-body">
                            {group.map((condition, conditionIndex) => (
                                <div key={conditionIndex} className="inventory-controls__filter-row">
                                    {options ? (
                                        <select className="form__input" value={condition[displayField]} onChange={(e) => handleUpdateCondition(type, groupIndex, conditionIndex, displayField, e.target.value)}>
                                            {options.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                                        </select>
                                    ) : (
                                        <SearchableSelect 
                                            items={type === 'uniqueSparkGroups' ? uniqueSkills : normalSkills} 
                                            placeholder={t('common:selectPlaceholder')} 
                                            value={condition.name ? masterSkillList.find(s => s.name_en === condition.name)?.[displayNameProp] || null : null} 
                                            onSelect={(item) => handleUpdateCondition(type, groupIndex, conditionIndex, 'name', (item as Skill).name_en)} 
                                        />
                                    )}
                                    <div className="inventory-controls__star-filter-wrapper">
                                        {maxStars > 0 && renderStarFilter(condition.stars, (v) => handleUpdateCondition(type, groupIndex, conditionIndex, 'stars', v), maxStars)}
                                    </div>
                                    <button className="inventory-controls__remove-btn" onClick={() => handleRemoveCondition(type, groupIndex, conditionIndex)} title={t('inventory.removeCondition')}>
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="inventory-controls__group-footer">
                            <button className="button button--secondary button--small w-full justify-center" onClick={() => handleAddCondition(type, groupIndex)}>
                                <FontAwesomeIcon icon={faPlus} className="mr-1" /> {t('inventory.addOrCondition')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

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
                        <input type="text" className="form__input" value={liveSearchTerm} onChange={(e) => setLiveSearchTerm(e.target.value)} />
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

                    {renderGroupedFilters('lineageSparkGroups', t('inventory.lineageSpark'), null, 'name', 0)}
                    {renderGroupedFilters('blueSparkGroups', t('inventory.blueSpark'), BLUE_SPARK_TYPES, 'type', 9, 3)}
                    {renderGroupedFilters('pinkSparkGroups', t('inventory.pinkSpark'), PINK_SPARK_TYPES, 'type', 9, 3)}
                    {renderGroupedFilters('uniqueSparkGroups', t('inventory.uniqueSpark'), null, 'name', 3, 6)}
                    {renderGroupedFilters('whiteSparkGroups', t('inventory.whiteSpark'), null, 'name', 9)}
                </div>
            )}
        </div>
    );
};

export default InventoryControls;