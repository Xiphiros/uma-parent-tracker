import { useState, useMemo, useEffect } from 'react';
import { SkillPreset } from '../types';
import Modal from './common/Modal';
import { useAppContext } from '../context/AppContext';
import DualListBox from './common/DualListBox';
import './EditPresetModal.css';

interface EditPresetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string | null, name: string, skillIds: string[]) => void;
    presetToEdit: SkillPreset | null;
}

const EditPresetModal = ({ isOpen, onClose, onSave, presetToEdit }: EditPresetModalProps) => {
    const { masterSkillList, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [name, setName] = useState('');
    const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());

    const purchasableSkills = useMemo(() => {
        return masterSkillList
            .filter(s => s.type === 'normal' && !s.id.startsWith('race_') && !s.id.startsWith('scenario_') && !s.id.startsWith('aptitude_'))
            .map(s => ({ id: s.id, name: s[displayNameProp] }));
    }, [masterSkillList, displayNameProp]);

    useEffect(() => {
        if (isOpen) {
            if (presetToEdit) {
                setName(presetToEdit.name);
                setSelectedSkillIds(new Set(presetToEdit.skillIds));
            } else {
                setName('New Preset');
                setSelectedSkillIds(new Set());
            }
        }
    }, [isOpen, presetToEdit]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(presetToEdit?.id || null, name.trim(), Array.from(selectedSkillIds));
            onClose();
        }
    };

    const modalTitle = presetToEdit ? `Edit Preset: ${presetToEdit.name}` : 'Create New Preset';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
            <div className="edit-preset__content">
                <div>
                    <label htmlFor="preset-name" className="form__label">Preset Name</label>
                    <input
                        id="preset-name"
                        type="text"
                        className="form__input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <DualListBox
                    allItems={purchasableSkills}
                    initialExcludedIds={new Set(purchasableSkills.filter(s => !selectedSkillIds.has(s.id)).map(s => s.id))}
                    onChange={(excludedIds) => {
                        const newSelectedIds = new Set(purchasableSkills.filter(s => !excludedIds.has(s.id)).map(s => s.id));
                        setSelectedSkillIds(newSelectedIds);
                    }}
                />
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>Cancel</button>
                <button className="button button--primary" onClick={handleSave}>Save Preset</button>
            </div>
        </Modal>
    );
};

export default EditPresetModal;