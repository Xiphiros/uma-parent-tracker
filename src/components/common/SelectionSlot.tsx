import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import './SelectionSlot.css';

interface SelectionSlotProps {
    label: string;
    selectedItem: { name: string; image?: string | null } | null;
    onClick?: () => void;
    onClear?: () => void;
}

const SelectionSlot = ({ label, selectedItem, onClick, onClear }: SelectionSlotProps) => {
    const isInteractive = !!onClick;

    return (
        <div className="selection-slot">
            {selectedItem ? (
                <div className={`selection-slot__card ${isInteractive ? 'selection-slot__card--interactive' : ''}`} onClick={onClick}>
                    {onClear && (
                        <button className="selection-slot__clear-btn" onClick={(e) => { e.stopPropagation(); onClear(); }}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    )}
                    <img src={selectedItem.image ? `${import.meta.env.BASE_URL}${selectedItem.image}` : undefined} alt={selectedItem.name} className="selection-slot__image" />
                    <span className="selection-slot__name">{selectedItem.name}</span>
                </div>
            ) : (
                <div className="selection-slot__placeholder" onClick={onClick}>
                    <div className="selection-slot__placeholder-icon">
                        <FontAwesomeIcon icon={faPlus} />
                    </div>
                    <span className="selection-slot__placeholder-label">{label}</span>
                </div>
            )}
        </div>
    );
};

export default SelectionSlot;