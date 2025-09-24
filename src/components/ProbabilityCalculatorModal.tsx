import { useState, useMemo, useEffect } from 'react';
import { Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './SelectAcquirableSkillsModal.css';

interface SelectAcquirableSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSkills: Skill[];
    selectedIds: Set<string>;
    onSave: (newSelectedIds: Set<string>) => void;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3, Other: 4 };

const SelectAcquirableSkillsModal = ({ isOpen, onClose, allSkills, selectedIds, onSave }: SelectAcquirableSkillsModalProps) => {
    const { t } = useTranslation(['roster', 'goal', 'common']);
    const { getActiveProfile, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(new Set(selectedIds));
        }
    }, [isOpen, selectedIds]);

    const handleToggle = (skillId: string) => {
        setLocalSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(skillId)) {
                newSet.delete(skillId);
            } else {
                newSet.add(skillId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(localSelectedIds);
        onClose();
    };

    const handleSelectAll = () => {
        setLocalSelectedIds(new Set(allSkills.map(s => s.id)));
    };

    const handleDeselectAll = () => {
        setLocalSelectedIds(new Set());
    };
    
    const getSkillDisplayName = (skill: Skill) => {
        return skill[displayNameProp] || skill.name_en;
    };

    const groupedAndFilteredSkills = useMemo(() => {
        const wishlistMap = new Map(goal?.wishlist.map(item => [item.name, item.tier]));
        const lowerQuery = searchQuery.toLowerCase();

        const filtered = allSkills.filter(skill => 
            getSkillDisplayName(skill).toLowerCase().includes(lowerQuery)
        );

        const grouped = filtered.reduce((acc, skill) => {
            const tier = wishlistMap.get(skill.name_en) || 'Other';
            if (!acc[tier]) {
                acc[tier] = [];
            }
            acc[tier].push(skill);
            return acc;
        }, {} as Record<string, Skill[]>);

        return Object.entries(grouped).sort(([tierA], [tierB]) => {
            return (WISH_RANK_ORDER[tierA] ?? 99) - (WISH_RANK_ORDER[tierB] ?? 99);
        });

    }, [allSkills, goal, searchQuery, displayNameProp]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.selectAcquirableSkills')} size="lg">
            <div className="skill-select__controls">
                <input
                    type="text"
                    placeholder={t('searchPlaceholder', { ns: 'common' })}
                    className="form__input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="skill-select__actions">
                    <button className="button button--secondary button--small" onClick={handleSelectAll}>{t('selectAll', { ns: 'common' })}</button>
                    <button className="button button--secondary button--small" onClick={handleDeselectAll}>{t('deselectAll', { ns: 'common' })}</button>
                </div>
            </div>

            <div className="skill-select__grid">
                {groupedAndFilteredSkills.map(([tier, skills]) => (
                    <div key={tier} className="skill-select__group">
                        <h4 className="skill-select__group-title">{tier === 'Other' ? t('otherSkills', { ns: 'common' }) : `${t('goal:wishlist.rank')} ${tier}`}</h4>
                        <div className="skill-select__list">
                            {skills.map(skill => (
                                <label key={skill.id} className="skill-select__item">
                                    <input
                                        type="checkbox"
                                        className="form__checkbox"
                                        checked={localSelectedIds.has(skill.id)}
                                        onChange={() => handleToggle(skill.id)}
                                    />
                                    {getSkillDisplayName(skill)}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="dialog-modal__footer">
                <div className="skill-select__summary">{t('skillsSelected', { ns: 'common', count: localSelectedIds.size })}</div>
                <div>
                    <button className="button button--neutral" onClick={onClose}>{t('cancel', { ns: 'common' })}</button>
                    <button className="button button--primary" onClick={handleSave}>{t('save', { ns: 'common' })}</button>
                </div>
            </div>
        </Modal>
    );
};

export default SelectAcquirableSkillsModal;