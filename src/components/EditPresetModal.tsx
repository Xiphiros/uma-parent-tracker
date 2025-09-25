import { useState, useMemo, useEffect } from 'react';
import { SkillPreset, Skill } from '../types';
import Modal from './common/Modal';
import { useAppContext } from '../context/AppContext';
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
    const [searchQuery, setSearchQuery] = useState('');

    const purchasableSkills = useMemo(() => {
        return masterSkillList
            .filter(s => s.type === 'normal' && !s.id.startsWith('race_') && !s.id.startsWith('scenario_') && !s.id.startsWith('aptitude_'));
    }, [masterSkillList]);

    useEffect(() => {
        if (isOpen) {
            if (presetToEdit) {
                setName(presetToEdit.name);
                setSelectedSkillIds(new Set(presetToEdit.skillIds));
            } else {
                setName('New Preset');
                setSelectedSkillIds(new Set());
            }
            setSearchQuery('');
        }
    }, [isOpen, presetToEdit]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(presetToEdit?.id || null, name.trim(), Array.from(selectedSkillIds));
            onClose();
        }
    };

    const handleToggle = (skillId: string) => {
        const newSet = new Set(selectedSkillIds);
        if (newSet.has(skillId)) {
            newSet.delete(skillId);
        } else {
            newSet.add(skillId);
        }
        setSelectedSkillIds(newSet);
    };

    const handleSelectAll = () => setSelectedSkillIds(new Set(purchasableSkills.map(s => s.id)));
    const handleDeselectAll = () => setSelectedSkillIds(new Set());

    const filteredSkills = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase();
        return purchasableSkills.filter(skill => 
            (skill[displayNameProp] || skill.name_en).toLowerCase().includes(lowerQuery)
        );
    }, [purchasableSkills, searchQuery, displayNameProp]);

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
                <div>
                    <div className="edit-preset__controls">
                        <input
                            type="text"
                            placeholder="Search skills..."
                            className="form__input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="edit-preset__actions">
                            <button className="button button--secondary button--small" onClick={handleSelectAll}>Select All</button>
                            <button className="button button--secondary button--small" onClick={handleDeselectAll}>Deselect All</button>
                        </div>
                    </div>
                    <div className="edit-preset__grid">
                        <div className="edit-preset__list">
                            {filteredSkills.map(skill => (
                                <label key={skill.id} className="edit-preset__item">
                                    <input
                                        type="checkbox"
                                        className="form__checkbox"
                                        checked={selectedSkillIds.has(skill.id)}
                                        onChange={() => handleToggle(skill.id)}
                                    />
                                    {skill[displayNameProp] || skill.name_en}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="dialog-modal__footer">
                <span className="edit-preset__summary">{selectedSkillIds.size} skills selected</span>
                <div>
                    <button className="button button--neutral" onClick={onClose}>Cancel</button>
                    <button className="button button--primary" onClick={handleSave}>Save Preset</button>
                </div>
            </div>
        </Modal>
    );
};

export default EditPresetModal;