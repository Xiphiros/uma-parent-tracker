import { useState, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useScrollLock } from '../../hooks/useScrollLock';
import './SearchableSelect.css';

interface SearchableItem {
  name_en: string;
  name_jp?: string;
  type?: string;
}

interface SearchableSelectProps {
  items: SearchableItem[];
  placeholder: string;
  onSelect: (item: SearchableItem) => void;
  value: string | null;
  disabled?: boolean;
}

const SearchableSelect = ({ items, placeholder, onSelect, value, disabled = false }: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');

  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useScrollLock(listRef, isOpen);

  useEffect(() => {
    if (isOpen) {
        const button = buttonRef.current;
        if (button) {
            const rect = button.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 220; // Estimated height: 200 list + 20 search

            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                setPosition('top');
            } else {
                setPosition('bottom');
            }
        }
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery) return items.slice(0, 100);
    return items.filter(
      item =>
        item.name_en.toLowerCase().includes(lowerQuery) ||
        (item.name_jp && item.name_jp.toLowerCase().includes(lowerQuery))
    ).slice(0, 100);
  }, [items, query]);

  const handleSelect = (item: SearchableItem) => {
    onSelect(item);
    setQuery('');
    setIsOpen(false);
  };

  const dropdownClasses = `searchable-select__dropdown searchable-select__dropdown--${position}`;

  return (
    <div className="searchable-select w-full" ref={dropdownRef}>
      <button
        type="button"
        className="searchable-select__button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        ref={buttonRef}
      >
        <span className={!value ? 'searchable-select__button-placeholder' : ''}>
          {value || placeholder}
        </span>
        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.97-2.97a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
      </button>

      {isOpen && !disabled && (
        <div className={dropdownClasses}>
          <input
            type="text"
            className="searchable-select__search-input form__input"
            placeholder="Search..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="searchable-select__list" ref={listRef}>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <li key={item.name_en} className="searchable-select__item" onClick={() => handleSelect(item)}>
                  {item.name_en}
                </li>
              ))
            ) : (
              <li className="searchable-select__item--no-results">No results found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;