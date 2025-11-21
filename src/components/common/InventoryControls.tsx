import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill, Filters, SortFieldType, SortDirectionType, InventoryViewType, FilterCategory, FilterCondition } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext, initialFilters } from '../../context/AppContext';
import './InventoryControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes, faArrowDownWideShort, faArrowUpShortWide, faPlus, faBolt, faHeart } from '@fortawesome/free-solid-svg-icons';
import RangeSlider from './RangeSlider';
import { useDebounce } from '../../hooks/useDebounce';

// Simple ID generator to replace uuid
const generateId = () => Math.random().toString(36).substr(2, 9);

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
        if (filters.searchTerm === '') setLiveSearchTerm('');
    }, [filters.searchTerm]);

    const uniqueSkills = masterSkillList.filter(s => s.category === 'unique');
    const normalSkills = masterSkillList.filter(s => s.category === 'white');

    // Clamp stars for representative scope
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
    
    const createDefaultCondition = (category: FilterCategory = 'blue', value: string = ''): FilterCondition => {
        let defaultValue = value;
        if (!defaultValue) {
            if (category === 'blue') defaultValue = 'Speed';
            else if (category === 'pink') defaultValue = 'Mile';
        }
        
        return {
            id: generateId(),
            category,
            value: defaultValue,
            stars: 3 // Default to 3 stars for quick filtering
        };
    };

    const handleAddGroup = (initialCondition?: FilterCondition) => {
        setFilters(prev => ({
            ...prev,
            conditionGroups: [...prev.conditionGroups, [initialCondition || createDefaultCondition()]]
        }));
    };

    const handleQuickFilter = (category: FilterCategory, value: string) => {
        // If the first group exists, add to it (OR logic). If not, create it.
        // Actually, "Quick Filter" implies "I want X". If I click "Speed" and "Stamina", I probably want Speed OR Stamina.
        // So we add to the *first* group if it exists, or create one.
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            if (newGroups.length === 0) {
                newGroups.push([createDefaultCondition(category, value)]);
            } else {
                // Check if it already exists to avoid duplicates
                const exists = newGroups[0].some(c => c.category === category && c.value === value);
                if (!exists) {
                    newGroups[0] = [...newGroups[0], createDefaultCondition(category, value)];
                }
            }
            return { ...prev, conditionGroups: newGroups };
        });
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
                newGroups.splice(groupIndex, 1);
            } else {
                newGroups[groupIndex] = [...newGroups[groupIndex]]; // Copy inner array
                newGroups[groupIndex].splice(conditionIndex, 1);
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

            if (updates.category && updates.category !== currentCondition.category) {
                if (updates.category === 'blue') updatedCondition.value = 'Speed';
                else if (updates.category === 'pink') updatedCondition.value = 'Mile';
                else updatedCondition.value = '';
                updatedCondition.stars = 1;
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
        // Slider Logic: 
        // For representative scope (looking at one parent), max is 3.
        // For total scope (looking at lineage), max is 9 (3 parents * 3 stars).
        const sliderMax = filters.searchScope === 'representative' ? 3 : 9;
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
                {/* Top Bar: View Scope */}
                <div className="inventory-controls__scope-toggle">
                    <button className={`inventory-controls__scope-btn ${inventoryView === 'all' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('all')}>{t('inventory.view.all')}</button>
                    <button className={`inventory-controls__scope-btn ${inventoryView === 'owned' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('owned')}>{t('inventory.view.owned')}</button>
                    <button className={`inventory-controls__scope-btn ${inventoryView === 'borrowed' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('borrowed')}>{t('inventory.view.borrowed')}</button>
                </div>

                {/* Search & Sort */}
                <div className="inventory-controls__top-bar">
                    <div className="inventory-controls__search-row">
                        <input type="text" className="form__input" placeholder={t('inventory.searchByName')} value={liveSearchTerm} onChange={(e) => setLiveSearchTerm(e.target.value)} />
                    </div>
                    <div className="inventory-controls__sort-row">
                        <select className="form__input flex-grow" value={sortField} onChange={(e) => setSortField(e.target.value as SortFieldType)}>
                            <option value="score">{t('inventory.sortOptions.finalScore')}</option>
                            <option value="individualScore">{t('inventory.sortOptions.individualScore')}</option>
                            <option value="name">{t('inventory.sortOptions.name')}</option>
                            <option value="gen">{t('inventory.sortOptions.gen')}</option>
                            <option value="id">{t('inventory.sortOptions.date')}</option>
                            <option value="sparks">{t('inventory.sortOptions.sparks')}</option>
                        </select>
                        <button className="button button--secondary" onClick={toggleSortDirection} title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}>
                            <FontAwesomeIcon icon={sortDirection === 'desc' ? faArrowDownWideShort : faArrowUpShortWide} />
                        </button>
                    </div>
                </div>

                {/* Quick Filters & Add Group Header */}
                <div className="inventory-controls__filters-header">
                    <span className="inventory-controls__section-title">{t('filtersTitle')}</span>
                    <div className="flex gap-2">
                        <button className="button button--neutral button--small" onClick={clearFilters} title={t('inventory.clearFilters')}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                        <button className="button button--secondary button--small" onClick={() => handleAddGroup()} title={t('inventory.addGroupTooltip')}>
                            <FontAwesomeIcon icon={faPlus} className="mr-1" /> {t('common:add')}
                        </button>
                    </div>
                </div>

                {/* Quick Filter Buttons (Shortcuts) */}
                {filters.conditionGroups.length === 0 && (
                    <div className="inventory-controls__quick-filters">
                        <button className="inventory-controls__quick-btn" onClick={() => handleQuickFilter('blue', 'Speed')}><FontAwesomeIcon icon={faBolt} className="text-blue-500 mr-1"/> Speed</button>
                        <button className="inventory-controls__quick-btn" onClick={() => handleQuickFilter('blue', 'Stamina')}><FontAwesomeIcon icon={faHeart} className="text-blue-500 mr-1"/> Stamina</button>
                        <button className="inventory-controls__quick-btn" onClick={() => handleQuickFilter('blue', 'Power')}><FontAwesomeIcon icon={faBolt} className="text-amber-600 mr-1"/> Power</button>
                        <button className="inventory-controls__quick-btn" onClick={() => handleQuickFilter('pink', 'Turf')}>Turf</button>
                        <button className="inventory-controls__quick-btn" onClick={() => handleQuickFilter('pink', 'Dirt')}>Dirt</button>
                    </div>
                )}

                {/* Filter Condition Groups (Always Visible) */}
                <div className="inventory-controls__groups-container">
                    {filters.conditionGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className="inventory-controls__filter-group">
                            <div className="inventory-controls__group-header">
                                <span className="inventory-controls__group-label">{t('inventory.matchAny')}</span>
                                <button className="button button--danger button--small" onClick={() => handleRemoveGroup(groupIndex)}>{t('inventory.removeGroup')}</button>
                            </div>
                            
                            <div className="inventory-controls__group-body">
                                {group.map((condition, conditionIndex) => (
                                    <div key={condition.id} className="inventory-controls__filter-row">
                                        <select 
                                            className="form__input" 
                                            value={condition.category} 
                                            onChange={(e) => handleUpdateCondition(groupIndex, conditionIndex, { category: e.target.value as FilterCategory })}
                                        >
                                            {CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{t(`inventory.${cat}Spark`)}</option>)}
                                        </select>

                                        {renderConditionValueInput(condition, groupIndex, conditionIndex)}

                                        <div className="inventory-controls__star-filter-wrapper">
                                            {renderStarFilter(condition.stars, (v) => handleUpdateCondition(groupIndex, conditionIndex, { stars: v }))}
                                        </div>

                                        <div className="inventory-controls__remove-btn" onClick={() => handleRemoveCondition(groupIndex, conditionIndex)}>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="inventory-controls__group-footer">
                                <button className="inventory-controls__add-btn" onClick={() => handleAddCondition(groupIndex)}>
                                    <FontAwesomeIcon icon={faPlus} /> {t('inventory.addOrCondition')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Advanced Toggle */}
                <button className="button button--neutral button--small w-full justify-center mt-2" onClick={() => setIsAdvanced(!isAdvanced)}>
                    <FontAwesomeIcon icon={faFilter} className="mr-2" /> {isAdvanced ? t('inventory.hideAdvanced') : t('inventory.showAdvanced')}
                </button>
            </div>
            
            {/* Advanced Settings */}
            {isAdvanced && (
                <div className="inventory-controls__advanced-panel">
                    <div>
                        <label className="inventory-controls__label mb-1">{t('inventory.searchScope')}</label>
                        <div className="inventory-controls__scope-toggle">
                            <button className={`inventory-controls__scope-btn ${filters.searchScope === 'total' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => handleFilterChange('searchScope', 'total')}>{t('inventory.scope.total')}</button>
                            <button className={`inventory-controls__scope-btn ${filters.searchScope === 'representative' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => handleFilterChange('searchScope', 'representative')}>{t('inventory.scope.representative')}</button>
                        </div>
                    </div>
                    <div>
                        <label className="inventory-controls__label">{t('inventory.minWhiteSkills')}</label>
                        <input type="number" className="form__input" min="0" value={filters.minWhiteSparks} onChange={e => handleFilterChange('minWhiteSparks', Math.max(0, parseInt(e.target.value, 10)) || 0)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryControls;