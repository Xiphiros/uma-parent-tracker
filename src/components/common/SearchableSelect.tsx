import { useState, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useScrollLock } from '../../hooks/useScrollLock';
import './SearchableSelect.css';
import { useTranslation } from 'react-i18next';

interface SearchableItem {
  name_en: string;
  name_jp?: string;
  type?: string;
  [key: string]: any; // Allow other properties
}

interface SearchableSelectProps {
  items: SearchableItem[];
  placeholder: string;
  onSelect: (item: SearchableItem) => void;
  value: string | null;
  displayProp?: 'name_en' | 'name_jp';
  disabled?: boolean;
}

const DROPDOWN_HEIGHT = 240; // Estimated height for position calculation

const SearchableSelect = ({ items, placeholder, onSelect, value, displayProp = 'name_en', disabled = false }: SearchableSelectProps) => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useScrollLock(listRef, isOpen);
  
  // Custom click-outside handler for portal
  useEffect(() => {
    const handler = (event: MouseEvent) => {
        if (!isOpen) return;
        const target = event.target as Node;
        const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
        const isOutsidePortal = portalRef.current && !portalRef.current.contains(target);
        if (isOutsideContainer && isOutsidePortal) {
            setIsOpen(false);
        }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
        const button = buttonRef.current;
        if (button) {
            const rect = button.getBoundingClientRect();
            setButtonRect(rect);
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT) {
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

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${buttonRect?.left ?? 0}px`,
    width: `${buttonRect?.width ?? 0}px`,
    zIndex: 90,
  };
  if (position === 'bottom') {
      dropdownStyle.top = `${(buttonRect?.bottom ?? 0) + 4}px`;
  } else {
      dropdownStyle.top = `${(buttonRect?.top ?? 0) - DROPDOWN_HEIGHT - 4}px`;
  }

  const modalRoot = document.getElementById('modal-root');

  return (
    <div className="searchable-select w-full" ref={containerRef}>
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

      {isOpen && !disabled && modalRoot && buttonRect && ReactDOM.createPortal(
        <div ref={portalRef} className="searchable-select__dropdown" style={dropdownStyle}>
          <input
            type="text"
            className="searchable-select__search-input form__input"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="searchable-select__list" ref={listRef}>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <li key={item.name_en} className="searchable-select__item" onClick={() => handleSelect(item)}>
                  {item[displayProp]}
                </li>
              ))
            ) : (
              <li className="searchable-select__item--no-results">{t('noResults')}</li>
            )}
          </ul>
        </div>,
        modalRoot
      )}
    </div>
  );
};

export default SearchableSelect;