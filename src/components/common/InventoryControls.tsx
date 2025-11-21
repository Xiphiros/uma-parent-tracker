import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill, Filters, SortFieldType, SortDirectionType, InventoryViewType, FilterCategory, FilterCondition } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext, initialFilters } from '../../context/AppContext';
import './InventoryControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes, faArrowDownWideShort, faArrowUpShortWide, faPlus } from '@fortawesome/free-solid-svg-icons';
import RangeSlider from './RangeSlider';
import { useDebounce } from '../../hooks/useDebounce';
import { v4 as uuidv4 } from 'uuid';

interface InventoryControlsProps {
    filters?: Filters;
    setFilters?: React.Dispatch<React.SetStateAction<Filters>>;
    sortField?: SortFieldType;
    setSortField?: (value: SortFieldType) => void;
    sortDirection?: SortDirectionType;
    setSortDirection?: (value: SortDirectionType) => void;
    inventoryView?: InventoryViewType;
    setInventoryView?: (value: InventoryViewType) => void;
}

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];

const CATEGORY_OPTIONS: FilterCategory[] = ['blue', 'pink', 'unique', 'white', 'lineage'];

const InventoryControls = (props: InventoryControlsProps) => {
    const { t } = useTranslation(['roster', 'game', 'common']);
    const { 
        masterSkillList, dataDisplayLanguage,
        filters: ctxFilters, setFilters: ctxSetFilters, 
        sortField: ctxSortField, setSortField: ctxSetSortField, 
        sortDirection: ctxSortDirection, setSortDirection: ctxSetSortDirection, 
        inventoryView: ctxInventoryView, setInventoryView: ctxSetInventoryView
    } = useAppContext();

    // Use props if provided, otherwise fallback to context
    const filters = props.filters ?? ctxFilters;
    const setFilters = props.setFilters ?? ctxSetFilters;
    const sortField = props.sortField ?? ctxSortField;
    const setSortField = props.setSortField ?? ctxSetSortField;
    const sortDirection = props.sortDirection ?? ctxSortDirection;
    const setSortDirection = props.setSortDirection ?? ctxSetSortDirection;
    const inventoryView = props.inventoryView ?? ctxInventoryView;
    const setInventoryView = props.setInventoryView ?? ctxSetInventoryView;

    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [isAdvanced, setIsAdvanced] = useState(false);
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

    // Clamp stars if switching to representative scope
    useEffect(() => {
        if (filters.searchScope === 'representative') {
            setFilters(prev => ({
                ...prev,
                conditionGroups: prev.conditionGroups.map(group => 
                    group.map(c => ({ ...c, stars: Math.min(c.stars, 3) }))
                )
            }));
        }
    }, [filters.searchScope, setFilters]);

    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };
    
    // --- New Unified Logic ---

    const createDefaultCondition = (category: FilterCategory = 'blue'): FilterCondition => {
        let defaultValue = '';
        if (category === 'blue') defaultValue = 'Speed';
        else if (category === 'pink') defaultValue = 'Mile';
        
        return {
            id: uuidv4(), // Use uuid to ensure stable keys for React
            category,
            value: defaultValue,
            stars: 1
        };
    };

    const handleAddGroup = () => {
        setFilters(prev => ({
            ...prev,
            conditionGroups: [...prev.conditionGroups, [createDefaultCondition()]]
        }));
    };

    const handleRemoveGroup = (groupIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            newGroups.splice(groupIndex, 1);
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const handleAddCondition = (groupIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            newGroups[groupIndex] = [...newGroups[groupIndex], createDefaultCondition()];
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const handleRemoveCondition = (groupIndex: number, conditionIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            if (newGroups[groupIndex].length === 1) {
                // Removing last condition removes the group
                newGroups.splice(groupIndex, 1);
            } else {
                const newGroup = [...newGroups[groupIndex]];
                newGroup.splice(conditionIndex, 1);
                newGroups[groupIndex] = newGroup;
            }
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const handleUpdateCondition = (groupIndex: number, conditionIndex: number, updates: Partial<FilterCondition>) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            const newGroup = [...newGroups[groupIndex]];
            const currentCondition = newGroup[conditionIndex];
            
            let updatedCondition = { ...currentCondition, ...updates };

            // If category changed, reset value to a sensible default
            if (updates.category && updates.category !== currentCondition.category) {
                if (updates.category === 'blue') updatedCondition.value = 'Speed';
                else if (updates.category === 'pink') updatedCondition.value = 'Mile';
                else updatedCondition.value = ''; // Reset for skills
                updatedCondition.stars = 1; // Reset stars
            }

            newGroup[conditionIndex] = updatedCondition;
            newGroups[groupIndex] = newGroup;
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };

    const clearFilters = () => {
        setLiveSearchTerm('');
        setFilters(initialFilters);
    };

    const renderStarFilter = (value: number, onChange: (value: number) => void) => {
        const sliderMax = filters.searchScope === 'representative' ? 3 : 9;
        // Adjust star max logic: For Blue/Pink in representative scope, max is 3. Total is always higher.
        // Actually, for individual parent check (representative), max blue/pink is 3.
        // For total lineage check, max blue/pink is 3 + 3 + 3 = 9.
        return <RangeSlider label="" min={1} max={sliderMax} value={value} onChange={onChange} />;
    };

    const renderConditionValueInput = (condition: FilterCondition, groupIndex: number, conditionIndex: number) => {
        const updateValue = (val: string) => handleUpdateCondition(groupIndex, conditionIndex, { value: val });

        switch (condition.category) {
            case 'blue':
                return (
                    <select className="form__input" value={condition.value} onChange={(e) => updateValue(e.target.value)}>
                        {BLUE_SPARK_TYPES.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                    </select>
                );
            case 'pink':
                return (
                    <select className="form__input" value={condition.value} onChange={(e) => updateValue(e.target.value)}>
                        {PINK_SPARK_TYPES.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                    </select>
                );
            case 'unique':
                return (
                    <SearchableSelect 
                        items={uniqueSkills} 
                        placeholder={t('common:selectPlaceholder')} 
                        value={condition.value ? masterSkillList.find(s => s.name_en === condition.value)?.[displayNameProp] || null : null} 
                        onSelect={(item) => updateValue((item as Skill).name_en)} 
                    />
                );
            case 'white':
            case 'lineage':
                return (
                    <SearchableSelect 
                        items={normalSkills} 
                        placeholder={t('common:selectPlaceholder')} 
                        value={condition.value ? masterSkillList.find(s => s.name_en === condition.value)?.[displayNameProp] || null : null} 
                        onSelect={(item) => updateValue((item as Skill).name_en)} 
                    />
                );
            default:
                return null;
        }
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

                    {/* Condition Groups */}
                    <div className="inventory-controls__group">
                        <div className="inventory-controls__filter-header">
                            <label className="inventory-controls__label">{t('inventory.filterGroups')}</label>
                            <button 
                                className="inventory-controls__add-btn" 
                                onClick={handleAddGroup} 
                                title={t('inventory.addGroupTooltip')}
                            >
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            {filters.conditionGroups.map((group, groupIndex) => (
                                <div key={groupIndex} className="inventory-controls__filter-group">
                                    <div className="inventory-controls__group-header">
                                        <span className="inventory-controls__group-title">{t('inventory.matchAny')}</span>
                                        <button className="button button--danger button--small" onClick={() => handleRemoveGroup(groupIndex)}>{t('inventory.removeGroup')}</button>
                                    </div>
                                    
                                    <div className="inventory-controls__group-body">
                                        {group.map((condition, conditionIndex) => (
                                            <div key={condition.id || `${groupIndex}-${conditionIndex}`} className="inventory-controls__filter-row">
                                                {/* Category Select */}
                                                <select 
                                                    className="form__input !w-24" 
                                                    value={condition.category} 
                                                    onChange={(e) => handleUpdateCondition(groupIndex, conditionIndex, { category: e.target.value as FilterCategory })}
                                                >
                                                    {CATEGORY_OPTIONS.map(cat => (
                                                        <option key={cat} value={cat}>{t(`inventory.${cat}Spark`)}</option>
                                                    ))}
                                                </select>

                                                {/* Value Input */}
                                                {renderConditionValueInput(condition, groupIndex, conditionIndex)}

                                                {/* Stars Slider */}
                                                <div className="inventory-controls__star-filter-wrapper">
                                                    {renderStarFilter(condition.stars, (v) => handleUpdateCondition(groupIndex, conditionIndex, { stars: v }))}
                                                </div>

                                                <button className="inventory-controls__remove-btn" onClick={() => handleRemoveCondition(groupIndex, conditionIndex)} title={t('inventory.removeCondition')}>
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="inventory-controls__group-footer">
                                        <button className="button button--secondary button--small w-full justify-center" onClick={() => handleAddCondition(groupIndex)}>
                                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> {t('inventory.addOrCondition')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryControls;