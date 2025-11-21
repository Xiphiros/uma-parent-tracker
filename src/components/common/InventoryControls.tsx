import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueSpark, Skill, Filters, SortFieldType, SortDirectionType, InventoryViewType, FilterCategory, FilterCondition } from '../../types';
import SearchableSelect from './SearchableSelect';
import { useAppContext, initialFilters } from '../../context/AppContext';
import './InventoryControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes, faArrowDownWideShort, faArrowUpShortWide, faPlus, faTrashCan, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import RangeSlider from './RangeSlider';
import { useDebounce } from '../../hooks/useDebounce';

// Simple ID generator
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

    // Collapsed state for categories (default open)
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (cat: string) => {
        setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    useEffect(() => {
        setFilters(prev => ({ ...prev, searchTerm: debouncedSearchTerm }));
    }, [debouncedSearchTerm, setFilters]);
    
    useEffect(() => {
        if (filters.searchTerm === '') setLiveSearchTerm('');
    }, [filters.searchTerm]);

    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.category === 'unique'), [masterSkillList]);
    const normalSkills = useMemo(() => masterSkillList.filter(s => s.category === 'white'), [masterSkillList]);

    // Define handleFilterChange here so it's accessible in the render scope
    const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const createDefaultCondition = (category: FilterCategory): FilterCondition => {
        let defaultValue = '';
        if (category === 'blue') defaultValue = 'Speed';
        else if (category === 'pink') defaultValue = 'Mile';
        
        return {
            id: generateId(),
            category,
            value: defaultValue,
            stars: 3
        };
    };

    // --- Logic Helpers ---

    const handleAddGroup = (category: FilterCategory) => {
        setFilters(prev => ({
            ...prev,
            conditionGroups: [...prev.conditionGroups, [createDefaultCondition(category)]]
        }));
        // Ensure category is expanded when adding
        setCollapsedCategories(prev => ({ ...prev, [category]: false }));
    };

    const handleRemoveGroup = (actualIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            newGroups.splice(actualIndex, 1);
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const handleAddConditionToGroup = (actualIndex: number, category: FilterCategory) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            newGroups[actualIndex] = [...newGroups[actualIndex], createDefaultCondition(category)];
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const handleRemoveConditionFromGroup = (actualIndex: number, conditionIndex: number) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            const group = [...newGroups[actualIndex]];
            
            if (group.length === 1) {
                newGroups.splice(actualIndex, 1); // Remove group if empty
            } else {
                group.splice(conditionIndex, 1);
                newGroups[actualIndex] = group;
            }
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const handleUpdateCondition = (actualIndex: number, conditionIndex: number, updates: Partial<FilterCondition>) => {
        setFilters(prev => {
            const newGroups = [...prev.conditionGroups];
            const group = [...newGroups[actualIndex]];
            group[conditionIndex] = { ...group[conditionIndex], ...updates };
            newGroups[actualIndex] = group;
            return { ...prev, conditionGroups: newGroups };
        });
    };

    const clearFilters = () => {
        setLiveSearchTerm('');
        setFilters(initialFilters);
    };

    // --- Render Helpers ---

    const renderStarFilter = (value: number, onChange: (value: number) => void, category: FilterCategory) => {
        // Slider Logic: 
        // - If category is 'unique', max is always 3 (unique skills don't stack across lineage in the same way).
        // - If scope is 'representative' (searching only the parent itself), max is 3.
        // - Otherwise (Total Lineage scope for Blue/Pink/White), max is 9.
        // - Lineage category (boolean check) technically doesn't use stars, but we default to 3 if rendered.
        
        let sliderMax = 9;
        if (category === 'unique' || category === 'lineage' || filters.searchScope === 'representative') {
            sliderMax = 3;
        }

        return <RangeSlider label="" min={1} max={sliderMax} value={value} onChange={onChange} />;
    };

    const renderConditionInput = (condition: FilterCondition, actualGroupIndex: number, conditionIndex: number) => {
        const updateValue = (val: string) => handleUpdateCondition(actualGroupIndex, conditionIndex, { value: val });
        
        let inputElement;
        if (condition.category === 'blue') {
            inputElement = (
                <select className="form__input inventory-controls__select" value={condition.value} onChange={(e) => updateValue(e.target.value)}>
                    {BLUE_SPARK_TYPES.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                </select>
            );
        } else if (condition.category === 'pink') {
             inputElement = (
                <select className="form__input inventory-controls__select" value={condition.value} onChange={(e) => updateValue(e.target.value)}>
                    {PINK_SPARK_TYPES.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                </select>
            );
        } else if (condition.category === 'unique') {
            inputElement = (
                <SearchableSelect 
                    items={uniqueSkills} 
                    placeholder={t('common:selectPlaceholder')} 
                    value={condition.value ? masterSkillList.find(s => s.name_en === condition.value)?.[displayNameProp] || null : null} 
                    onSelect={(item) => updateValue((item as Skill).name_en)} 
                />
            );
        } else {
            inputElement = (
                <SearchableSelect 
                    items={normalSkills} 
                    placeholder={t('common:selectPlaceholder')} 
                    value={condition.value ? masterSkillList.find(s => s.name_en === condition.value)?.[displayNameProp] || null : null} 
                    onSelect={(item) => updateValue((item as Skill).name_en)} 
                />
            );
        }

        return (
            <div key={condition.id} className="inventory-controls__condition-row">
                <div className="flex-grow min-w-0">
                     {inputElement}
                </div>
                {condition.category !== 'lineage' && (
                    <div className="inventory-controls__slider-wrapper">
                        {renderStarFilter(condition.stars, (v) => handleUpdateCondition(actualGroupIndex, conditionIndex, { stars: v }), condition.category)}
                    </div>
                )}
                <button 
                    className="inventory-controls__icon-btn text-stone-400 hover:text-red-500"
                    onClick={() => handleRemoveConditionFromGroup(actualGroupIndex, conditionIndex)}
                >
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </div>
        );
    };

    const renderCategorySection = (category: FilterCategory) => {
        const isCollapsed = collapsedCategories[category];
        
        // Find groups that PRIMARILY belong to this category (based on the first condition)
        // We map them to their original indices to handle updates correctly
        const relevantGroups = filters.conditionGroups
            .map((group, index) => ({ group, index }))
            .filter(({ group }) => group.length > 0 && group[0].category === category);

        return (
            <div className="inventory-controls__category-section">
                <div className="inventory-controls__category-header" onClick={() => toggleCategory(category)}>
                    <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronDown} className="w-3 h-3 text-stone-400" />
                        <span className="inventory-controls__category-title">{t(`inventory.${category}Spark`)}</span>
                        {relevantGroups.length > 0 && <span className="text-xs text-stone-500 font-normal">({relevantGroups.length})</span>}
                    </div>
                    <button 
                        className="inventory-controls__icon-btn text-stone-500 hover:text-indigo-500"
                        onClick={(e) => { e.stopPropagation(); handleAddGroup(category); }}
                        title={t('inventory.addGroupTooltip')}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
                
                {!isCollapsed && (
                    <div className="inventory-controls__category-body">
                        {relevantGroups.map(({ group, index: actualIndex }) => (
                            <div key={actualIndex} className="inventory-controls__filter-card">
                                <div className="inventory-controls__filter-list">
                                    {group.map((condition, conditionIndex) => (
                                        <div key={condition.id}>
                                            {conditionIndex > 0 && <div className="inventory-controls__or-divider">{t('inventory.or')}</div>}
                                            {renderConditionInput(condition, actualIndex, conditionIndex)}
                                        </div>
                                    ))}
                                </div>
                                <div className="inventory-controls__card-footer">
                                    <button className="text-xs text-indigo-500 hover:underline" onClick={() => handleAddConditionToGroup(actualIndex, category)}>
                                        + {t('inventory.addOrCondition')}
                                    </button>
                                    <button className="inventory-controls__icon-btn text-stone-400 hover:text-red-500" onClick={() => handleRemoveGroup(actualIndex)}>
                                        <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {relevantGroups.length === 0 && (
                            <div className="text-xs text-stone-400 italic p-2 text-center">{t('inventory.noFiltersInCategory')}</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="inventory-controls">
            <div className="inventory-controls__main">
                {/* Scope Toggle */}
                <div className="inventory-controls__scope-toggle">
                    <button className={`inventory-controls__scope-btn ${inventoryView === 'all' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('all')}>{t('inventory.view.all')}</button>
                    <button className={`inventory-controls__scope-btn ${inventoryView === 'owned' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('owned')}>{t('inventory.view.owned')}</button>
                    <button className={`inventory-controls__scope-btn ${inventoryView === 'borrowed' ? 'inventory-controls__scope-btn--active' : ''}`} onClick={() => setInventoryView('borrowed')}>{t('inventory.view.borrowed')}</button>
                </div>

                {/* Search & Sort */}
                <div className="space-y-2">
                    <input type="text" className="form__input" placeholder={t('inventory.searchByName')} value={liveSearchTerm} onChange={(e) => setLiveSearchTerm(e.target.value)} />
                    <div className="flex gap-2">
                         <select className="form__input flex-grow" value={sortField} onChange={(e) => setSortField(e.target.value as SortFieldType)}>
                            <option value="score">{t('inventory.sortOptions.finalScore')}</option>
                            <option value="individualScore">{t('inventory.sortOptions.individualScore')}</option>
                            <option value="name">{t('inventory.sortOptions.name')}</option>
                            <option value="gen">{t('inventory.sortOptions.gen')}</option>
                            <option value="id">{t('inventory.sortOptions.date')}</option>
                            <option value="sparks">{t('inventory.sortOptions.sparks')}</option>
                        </select>
                         <button className="button button--secondary flex-shrink-0 px-3" onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>
                            <FontAwesomeIcon icon={sortDirection === 'desc' ? faArrowDownWideShort : faArrowUpShortWide} />
                        </button>
                    </div>
                </div>

                <div className="inventory-controls__divider"></div>
                
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300">{t('filtersTitle')}</h4>
                    <button className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300" onClick={clearFilters}>
                        {t('inventory.clearFilters')}
                    </button>
                </div>

                <div className="inventory-controls__categories">
                    {renderCategorySection('blue')}
                    {renderCategorySection('pink')}
                    {renderCategorySection('unique')}
                    {renderCategorySection('white')}
                </div>

                <button className="button button--neutral button--small w-full justify-center mt-4" onClick={() => setIsAdvanced(!isAdvanced)}>
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
                     {renderCategorySection('lineage')}
                </div>
            )}
        </div>
    );
};

export default InventoryControls;