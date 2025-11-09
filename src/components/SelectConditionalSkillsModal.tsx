import { useState, useMemo, useEffect } from 'react';
import { BreedingPair, ManualParentData, Parent, Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './SelectAcquirableSkillsModal.css';
import { resolveGrandparent } from '../utils/affinity';
import PurchaseOrderInfoModal from './PurchaseOrderInfoModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import ManagePresetsModal from './ManagePresetsModal';

interface SelectAcquirableSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSkills: Skill[];
    selectedIds: Set<number>;
    onSave: (newSelectedIds: Set<number>) => void;
    pair: BreedingPair | null;
    spBudget: number;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3, Other: 4 };

const SelectAcquirableSkillsModal = ({ isOpen, onClose, allSkills: availableSkills, selectedIds, onSave, pair, spBudget }: SelectAcquirableSkillsModalProps) => {
    const { t } = useTranslation(['roster', 'goal', 'common']);
    const { getActiveProfile, dataDisplayLanguage, appData } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedIds(new Set(selectedIds));
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

    const handleSelectAll = () => setLocalSelectedIds(new Set(availableSkills.map(s => s.id)));
    const handleDeselectAll = () => setLocalSelectedIds(new Set());

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

        const lineageSkillIds = new Set<number>();
        availableSkills.forEach(skill => {
            if (lineageSkillNames.has(skill.name_en)) {
                lineageSkillIds.add(skill.id);
            }
        });
        
        setLocalSelectedIds(prev => new Set([...prev, ...lineageSkillIds]));
    };
    
    const handleApplyPreset = () => {
        if (!selectedPresetId) return;
        const preset = appData.skillPresets.find(p => p.id === selectedPresetId);
        if (preset) {
            setLocalSelectedIds(prev => new Set([...prev, ...preset.skillIds]));
        }
    };

    const getSkillDisplayName = (skill: Skill): string => {
        if (!skill) return '';
        return skill[displayNameProp] || skill.name_en || skill.name_jp || '';
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
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.selectAcquirableSkills')} size="lg">
                <div className="skill-select__controls">
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder', { ns: 'common' })}
                        className="form__input"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="skill-select__actions-bar">
                    <div className="skill-select__preset-controls">
                        <select className="form__input" value={selectedPresetId} onChange={e => setSelectedPresetId(e.target.value)}>
                            <option value="">Select a Preset...</option>
                            {appData.skillPresets.map(preset => (
                                <option key={preset.id} value={preset.id}>{preset.name}</option>
                            ))}
                        </select>
                        <button className="button button--secondary button--small" onClick={handleApplyPreset} disabled={!selectedPresetId}>Apply</button>
                        <button className="button button--neutral button--small" onClick={() => setIsManagePresetsOpen(true)}>Manage...</button>
                    </div>
                    <div className="skill-select__batch-actions">
                        <button className="button button--secondary button--small" onClick={() => setIsInfoModalOpen(true)} title={t('breedingPlanner.purchaseOrder.tooltip')}>
                            <FontAwesomeIcon icon={faInfoCircle} />
                        </button>
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
                                    return (
                                        <label key={skill.id} className="skill-select__item">
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
            
            <PurchaseOrderInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
                groupedSkills={groupedAndFilteredSkills}
                spBudget={spBudget}
            />

            <ManagePresetsModal
                isOpen={isManagePresetsOpen}
                onClose={() => setIsManagePresetsOpen(false)}
            />
        </>
    );
};

export default SelectAcquirableSkillsModal;