import { useClickOutside } from '../../hooks/useClickOutside';
import { useState, useRef } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import './MultiSelect.css';

interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelect = ({ options, selectedValues, onChange, placeholder = "Select..." }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false);
  });
  const listRef = useRef<HTMLDivElement>(null);
  useScrollLock(listRef, isOpen);

  const handleSelect = (option: string) => {
    let newSelected: string[];
    if (selectedValues.includes(option)) {
      newSelected = selectedValues.filter(v => v !== option);
    } else {
      newSelected = [...selectedValues, option];
    }
    onChange(newSelected);
  };
  
  const removeValue = (value: string) => {
    onChange(selectedValues.filter(v => v !== value));
  };

  return (
    <div className="multi-select" ref={dropdownRef}>
      <div className="multi-select__input" onClick={() => setIsOpen(!isOpen)}>
        {selectedValues.map(value => (
          <div key={value} className="multi-select__chip">
            {value}
            <span 
              className="multi-select__chip-remove"
              onClick={(e) => { e.stopPropagation(); removeValue(value); }}
            >
              &times;
            </span>
          </div>
        ))}
        {selectedValues.length === 0 && <span className="text-gray-400 ml-2">{placeholder}</span>}
      </div>
      {isOpen && (
        <div className="multi-select__dropdown" ref={listRef}>
          {options.map(option => (
            <label key={option} className="multi-select__dropdown-item">
              <input
                type="checkbox"
                className="mr-2"
                value={option}
                checked={selectedValues.includes(option)}
                onChange={() => handleSelect(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;