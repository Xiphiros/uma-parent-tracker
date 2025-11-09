import { useState, useMemo, useEffect } from 'react';
import { Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './SelectConditionalSkillsModal.css';

// New, simplified props interface
interface SelectConditionalSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSkills: Skill[];
    selectedIds: Set<number>;
    onSave: (newSelectedIds: Set<number>) => void;
}

const SelectConditionalSkillsModal = ({ isOpen, onClose, allSkills, selectedIds, onSave }: SelectConditionalSkillsModalProps) => {
    const { t } = useTranslation(['roster', 'common']);
    const { dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(new Set(selectedIds));
            setSearchQuery(''); // Reset search on open
        }
    }, [isOpen, selectedIds]);

    const handleToggle = (skillId: number) => {
        const newSet = new Set(localSelectedIds);
        if (newSet.has(skillId)) {
            newSet.delete(skillId);
        } else {
            newSet.add(skillId);
        }
        setLocalSelectedIds(newSet);
    };

    const handleSave = () => {
        onSave(localSelectedIds);
        onClose();
    };

    const handleSelectAll = () => setLocalSelectedIds(new Set(allSkills.map(s => s.id)));
    const handleDeselectAll = () => setLocalSelectedIds(new Set());

    const getSkillDisplayName = (skill: Skill): string => {
        if (!skill) return '';
        return skill[displayNameProp] || skill.name_en || skill.name_jp || '';
    };

    const filteredSkills = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase();
        return allSkills.filter(skill =>
            getSkillDisplayName(skill).toLowerCase().includes(lowerQuery)
        );
    }, [allSkills, searchQuery, displayNameProp]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.selectConditionalSkills')} size="lg">
            <div className="conditional-skill-select__controls">
                <input
                    type="text"
                    placeholder={t('searchPlaceholder', { ns: 'common' })}
                    className="form__input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="conditional-skill-select__actions">
                    <button className="button button--secondary button--small" onClick={handleSelectAll}>{t('selectAll', { ns: 'common' })}</button>
                    <button className="button button--secondary button--small" onClick={handleDeselectAll}>{t('deselectAll', { ns: 'common' })}</button>
                </div>
            </div>

            <div className="conditional-skill-select__grid">
                <div className="conditional-skill-select__list">
                    {filteredSkills.map(skill => {
                        const isChecked = localSelectedIds.has(skill.id);
                        return (
                            <label key={skill.id} className="conditional-skill-select__item">
                                <input
                                    type="checkbox"
                                    className="form__checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggle(skill.id)}
                                />
                                {getSkillDisplayName(skill)}
                            </label>
                        );
                    })}
                </div>
            </div>

            <div className="dialog-modal__footer">
                <div className="conditional-skill-select__summary">{t('breedingPlanner.skillsSelected', { count: localSelectedIds.size })}</div>
                <div>
                    <button className="button button--neutral" onClick={onClose}>{t('cancel', { ns: 'common' })}</button>
                    <button className="button button--primary" onClick={handleSave}>{t('save', { ns: 'common' })}</button>
                </div>
            </div>
        </Modal>
    );
};

export default SelectConditionalSkillsModal;