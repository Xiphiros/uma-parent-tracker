import { useState, useMemo, useEffect, useRef } from 'react';

interface Item {
    id: string;
    name: string;
}

interface DualListBoxProps {
    allItems: Item[];
    initialExcludedIds: Set<string>;
    onChange: (newExcludedIds: Set<string>) => void;
    availableTitle?: string;
    excludedTitle?: string;
}

export const DualListBox = ({
    allItems,
    initialExcludedIds,
    onChange,
    availableTitle = 'Available',
    excludedTitle = 'Excluded',
}: DualListBoxProps) => {
    const [excludedIds, setExcludedIds] = useState(new Set(initialExcludedIds));
    const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
    const [selectedExcluded, setSelectedExcluded] = useState<Set<string>>(new Set());
    const [filterAvailable, setFilterAvailable] = useState('');
    const [filterExcluded, setFilterExcluded] = useState('');

    const lastClickedAvailable = useRef<string | null>(null);
    const lastClickedExcluded = useRef<string | null>(null);
    
    useEffect(() => {
        onChange(excludedIds);
    }, [excludedIds, onChange]);

    const { availableItems, excludedItems } = useMemo(() => {
        const available = [];
        const excluded = [];
        for (const item of allItems) {
            if (excludedIds.has(item.id)) {
                excluded.push(item);
            } else {
                available.push(item);
            }
        }
        return { availableItems: available, excludedItems: excluded };
    }, [allItems, excludedIds]);

    const filteredAvailable = useMemo(() => availableItems.filter(item => item.name.toLowerCase().includes(filterAvailable.toLowerCase())), [availableItems, filterAvailable]);
    const filteredExcluded = useMemo(() => excludedItems.filter(item => item.name.toLowerCase().includes(filterExcluded.toLowerCase())), [excludedItems, filterExcluded]);

    const handleSelect = (listType: 'available' | 'excluded', item: Item, event: React.MouseEvent) => {
        const currentSelection = listType === 'available' ? selectedAvailable : selectedExcluded;
        const setSelection = listType === 'available' ? setSelectedAvailable : setSelectedExcluded;
        const lastClickedRef = listType === 'available' ? lastClickedAvailable : lastClickedExcluded;
        const items = listType === 'available' ? filteredAvailable : filteredExcluded;
        
        const newSelection = new Set(currentSelection);

        if (event.ctrlKey || event.metaKey) {
            newSelection.has(item.id) ? newSelection.delete(item.id) : newSelection.add(item.id);
        } else if (event.shiftKey && lastClickedRef.current) {
            const lastIndex = items.findIndex(i => i.id === lastClickedRef.current);
            const currentIndex = items.findIndex(i => i.id === item.id);
            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                for (let i = start; i <= end; i++) {
                    newSelection.add(items[i].id);
                }
            }
        } else {
            if (newSelection.has(item.id) && newSelection.size === 1) {
                newSelection.clear();
            } else {
                newSelection.clear();
                newSelection.add(item.id);
            }
        }
        
        lastClickedRef.current = item.id;
        setSelection(newSelection);
    };

    const moveItems = (from: 'available' | 'excluded') => {
        if (from === 'available') {
            setExcludedIds(prev => new Set([...prev, ...selectedAvailable]));
            setSelectedAvailable(new Set());
            lastClickedAvailable.current = null;
        } else {
            const newExcluded = new Set(excludedIds);
            selectedExcluded.forEach(id => newExcluded.delete(id));
            setExcludedIds(newExcluded);
            setSelectedExcluded(new Set());
            lastClickedExcluded.current = null;
        }
    };
    
    const handleDoubleClick = (from: 'available' | 'excluded', item: Item) => {
        if (from === 'available') {
             setExcludedIds(prev => new Set([...prev, item.id]));
        } else {
            const newExcluded = new Set(excludedIds);
            newExcluded.delete(item.id);
            setExcludedIds(newExcluded);
        }
    };

    const renderList = (listType: 'available' | 'excluded') => {
        const items = listType === 'available' ? filteredAvailable : filteredExcluded;
        const selected = listType === 'available' ? selectedAvailable : selectedExcluded;
        
        return (
            <div className="dual-list-box__list-wrapper">
                <ul className="dual-list-box__list">
                    {items.map(item => (
                        <li
                            key={item.id}
                            className={`dual-list-box__item ${selected.has(item.id) ? 'dual-list-box__item--selected' : ''}`}
                            onClick={(e) => handleSelect(listType, item, e)}
                            onDoubleClick={() => handleDoubleClick(listType, item)}
                        >
                            {item.name}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="dual-list-box">
            <div className="dual-list-box__column">
                <h4 className="dual-list-box__title">{availableTitle} ({filteredAvailable.length})</h4>
                <input type="text" className="form__input dual-list-box__filter" placeholder="Filter..." value={filterAvailable} onChange={e => setFilterAvailable(e.target.value)} />
                {renderList('available')}
            </div>

            <div className="dual-list-box__controls">
                <button className="button button--secondary" onClick={() => moveItems('available')} disabled={selectedAvailable.size === 0}>&gt;</button>
                <button className="button button--secondary" onClick={() => moveItems('excluded')} disabled={selectedExcluded.size === 0}>&lt;</button>
            </div>

            <div className="dual-list-box__column">
                 <h4 className="dual-list-box__title">{excludedTitle} ({filteredExcluded.length})</h4>
                <input type="text" className="form__input dual-list-box__filter" placeholder="Filter..." value={filterExcluded} onChange={e => setFilterExcluded(e.target.value)} />
                {renderList('excluded')}
            </div>
        </div>
    );
};