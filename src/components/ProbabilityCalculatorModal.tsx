import { useState, useMemo, useEffect } from 'react';
import { BreedingPair, ManualParentData, Parent, Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './SelectAcquirableSkillsModal.css';
import { resolveGrandparent } from '../utils/affinity';

interface SelectAcquirableSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSkills: Skill[];
    selectedIds: Set<string>;
    onSave: (newSelectedIds: Set<string>) => void;
    pair: BreedingPair | null;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3, Other: 4 };

const SelectAcquirableSkillsModal = ({ isOpen, onClose, allSkills: availableSkills, selectedIds, onSave, pair }: SelectAcquirableSkillsModalProps) => {
    const { t } = useTranslation(['roster', 'goal', 'common']);
    const { getActiveProfile, dataDisplayLanguage, masterSkillList, appData } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds);
    const [searchQuery, setSearchQuery] = useState('');

    const skillGroupMap = useMemo(() => {
        const map = new Map<number, { lv1?: Skill, lv2?: Skill }>();
        masterSkillList.forEach(skill => {
            if (skill.groupId) {
                if (!map.has(skill.groupId)) map.set(skill.groupId, {});
                const group = map.get(skill.groupId)!;
                if (skill.rarity === 1) group.lv1 = skill;
                else if (skill.rarity === 2) group.lv2 = skill;
            }
        });
        return map;
    }, [masterSkillList]);

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(new Set(selectedIds));
        }
    }, [isOpen, selectedIds]);

    const handleToggle = (skillId: string) => {
        const newSet = new Set(localSelectedIds);
        const skill = masterSkillList.find(s => s.id === skillId);

        if (!skill || !skill.groupId) { // Not part of a group, toggle normally
            newSet.has(skillId) ? newSet.delete(skillId) : newSet.add(skillId);
            setLocalSelectedIds(newSet);
            return;
        }

        const group = skillGroupMap.get(skill.groupId);
        const lv1 = group?.lv1;
        const lv2 = group?.lv2;
        const isSelecting = !newSet.has(skillId);

        if (skill.rarity === 2 && isSelecting) { // Selecting Lv2 skill
            newSet.add(skill.id);
            if (lv1) newSet.add(lv1.id);
        } else if (skill.rarity === 1 && !isSelecting) { // Deselecting Lv1 skill
            newSet.delete(skill.id);
            if (lv2) newSet.delete(lv2.id);
        } else { // All other cases (selecting Lv1, deselecting Lv2)
            newSet.has(skillId) ? newSet.delete(skillId) : newSet.add(skillId);
        }

        setLocalSelectedIds(newSet);
    };

    const handleSave = () => {
        onSave(localSelectedIds);
        onClose();
    };

    const handleSelectAll = () => {
        setLocalSelectedIds(new Set(availableSkills.map(s => s.id)));
    };

    const handleDeselectAll = () => {
        setLocalSelectedIds(new Set());
    };

    const handleSelectLineage = () => {
        if (!pair) return;
        
        const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));
        const lineage: (Parent | ManualParentData | null)[] = [
            pair.p1, pair.p2,
            resolveGrandparent(pair.p1.grandparent1, inventoryMap),
            resolveGrandparent(pair.p1.grandparent2, inventoryMap),
            resolveGrandparent(pair.p2.grandparent1, inventoryMap),
            resolveGrandparent(pair.p2.grandparent2, inventoryMap),
        ];

        const lineageSkillNames = new Set<string>();
        lineage.forEach(member => {
            if (member) {
                member.whiteSparks.forEach(spark => lineageSkillNames.add(spark.name));
            }
        });

        const lineageSkillIds = new Set<string>();
        availableSkills.forEach(skill => {
            if (lineageSkillNames.has(skill.name_en)) {
                lineageSkillIds.add(skill.id);
            }
        });
        
        setLocalSelectedIds(lineageSkillIds);
    };
    
    const getSkillDisplayName = (skill: Skill) => {
        return skill[displayNameProp] || skill.name_en;
    };

    const groupedAndFilteredSkills = useMemo(() => {
        const wishlistMap = new Map(goal?.wishlist.map(item => [item.name, item.tier]));
        const lowerQuery = searchQuery.toLowerCase();

        const filtered = availableSkills.filter(skill => 
            getSkillDisplayName(skill).toLowerCase().includes(lowerQuery)
        );

        const grouped = filtered.reduce((acc, skill) => {
            const tier = wishlistMap.get(skill.name_en) || 'Other';
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(skill);
            return acc;
        }, {} as Record<string, Skill[]>);

        return Object.entries(grouped).sort(([tierA], [tierB]) => 
            (WISH_RANK_ORDER[tierA] ?? 99) - (WISH_RANK_ORDER[tierB] ?? 99)
        );
    }, [availableSkills, goal, searchQuery, displayNameProp]);
    
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
                    <button className="button button--secondary button--small" onClick={handleSelectLineage} disabled={!pair}>{t('breedingPlanner.selectLineage')}</button>
                    <button className="button button--secondary button--small" onClick={handleSelectAll}>{t('selectAll', { ns: 'common' })}</button>
                    <button className="button button--secondary button--small" onClick={handleDeselectAll}>{t('deselectAll', { ns: 'common' })}</button>
                </div>
            </div>

            <div className="skill-select__grid">
                {groupedAndFilteredSkills.map(([tier, skills]) => (
                    <div key={tier} className="skill-select__group">
                        <h4 className="skill-select__group-title">{tier === 'Other' ? t('otherSkills', { ns: 'common' }) : `${t('goal:wishlist.rank')} ${tier}`}</h4>
                        <div className="skill-select__list">
                            {skills.map(skill => {
                                const isChecked = localSelectedIds.has(skill.id);
                                let isDisabled = false;

                                if (skill.rarity === 1 && skill.groupId) {
                                    const lv2Skill = skillGroupMap.get(skill.groupId)?.lv2;
                                    if (lv2Skill && localSelectedIds.has(lv2Skill.id)) {
                                        isDisabled = true;
                                    }
                                }

                                return (
                                    <label key={skill.id} className="skill-select__item">
                                        <input
                                            type="checkbox"
                                            className="form__checkbox"
                                            checked={isChecked}
                                            disabled={isDisabled}
                                            onChange={() => handleToggle(skill.id)}
                                        />
                                        {getSkillDisplayName(skill)}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="dialog-modal__footer">
                <div className="skill-select__summary">{t('breedingPlanner.skillsSelected', { count: localSelectedIds.size })}</div>
                <div>
                    <button className="button button--neutral" onClick={onClose}>{t('cancel', { ns: 'common' })}</button>
                    <button className="button button--primary" onClick={handleSave}>{t('save', { ns: 'common' })}</button>
                </div>
            </div>
        </Modal>
    );
};

export default SelectAcquirableSkillsModal;