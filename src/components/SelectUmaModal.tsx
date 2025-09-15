import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Uma } from '../types';
import Modal from './common/Modal';
import './SelectUmaModal.css';
import { useTranslation } from 'react-i18next';

interface SelectUmaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (uma: Uma) => void;
}

const SelectUmaModal = ({ isOpen, onClose, onSelect }: SelectUmaModalProps) => {
    const { t } = useTranslation('common');
    const { masterUmaList, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const [filter, setFilter] = useState('');

    const filteredUmas = useMemo(() => {
        if (!filter) return masterUmaList;
        const lowerFilter = filter.toLowerCase();
        return masterUmaList.filter(uma => uma[displayNameProp].toLowerCase().includes(lowerFilter));
    }, [filter, masterUmaList, displayNameProp]);

    const handleSelect = (uma: Uma) => {
        onSelect(uma);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('selectUmaTitle')} size="xl">
            <div className="select-uma-modal__controls">
                <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    className="form__input"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="select-uma-modal__grid">
                {filteredUmas.map(uma => (
                    <div key={uma.id} className="select-uma-modal__card" onClick={() => handleSelect(uma)}>
                        <img src={`${import.meta.env.BASE_URL}${uma.image}`} alt={uma[displayNameProp]} className="select-uma-modal__image" />
                        <span className="select-uma-modal__name">{uma[displayNameProp]}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default SelectUmaModal;