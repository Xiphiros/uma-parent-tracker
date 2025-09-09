import { useClickOutside } from '../../hooks/useClickOutside';
import { useState, useRef } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import './MultiSelect.css';
import { useTranslation } from 'react-i18next';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelect = ({ options, selectedValues, onChange, placeholder }: MultiSelectProps) => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
  });
  const listRef = useRef<HTMLDivElement>(null);
  useScrollLock(listRef, isOpen);

  const handleSelect = (optionValue: string) => {
    let newSelected: string[];
    if (selectedValues.includes(optionValue)) {
      newSelected = selectedValues.filter(v => v !== optionValue);
    } else {
      newSelected = [...selectedValues, optionValue];
    }
    onChange(newSelected);
  };
  
  const removeValue = (value: string) => {
    onChange(selectedValues.filter(v => v !== value));
  };
  
  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));

  return (
    <div className="multi-select" ref={dropdownRef}>
      <div className="multi-select__input" onClick={() => setIsOpen(!isOpen)}>
        {selectedOptions.map(option => (
          <div key={option.value} className="multi-select__chip">
            {option.label}
            <span 
              className="multi-select__chip-remove"
              onClick={(e) => { e.stopPropagation(); removeValue(option.value); }}
            >
              &times;
            </span>
          </div>
        ))}
        {selectedValues.length === 0 && <span className="text-gray-400 ml-2">{placeholder || t('selectPlaceholder')}</span>}
      </div>
      {isOpen && (
        <div className="multi-select__dropdown" ref={listRef}>
          {options.map(option => (
            <label key={option.value} className="multi-select__dropdown-item">
              <input
                type="checkbox"
                className="mr-2"
                value={option.value}
                checked={selectedValues.includes(option.value)}
                onChange={() => handleSelect(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;