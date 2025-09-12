import { useState, useMemo, useEffect } from 'react';
import { Parent, Uma, ManualParentData, BlueSpark, Grandparent, Skill, WhiteSpark, UniqueSpark } from '../types';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { useTranslation } from 'react-i18next';
import './SelectGrandparentModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import InventoryModal from './InventoryModal';
import { formatStars } from '../utils/ui';

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = ['Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'];
const STAR_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3];

const initialManualGpState: ManualParentData = {
    umaId: undefined, blueSpark: { type: 'Speed', stars: 1 },
    pinkSpark: { type: 'Turf', stars: 1 }, uniqueSparks: [], whiteSparks: [],
};

interface SelectGrandparentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Grandparent) => void;
    title: string;
    grandparentToEdit?: Grandparent | null;
}

const SelectGrandparentModal = ({ isOpen, onClose, onSave, title, grandparentToEdit }: SelectGrandparentModalProps) => {
    const { t } = useTranslation(['modals', 'game', 'roster', 'common']);
    const { masterUmaList, masterSkillList, dataDisplayLanguage, umaMapById, appData, skillMapByName } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const [selectionType, setSelectionType] = useState<'inventory' | 'manual'>('inventory');
    const [selectedInventoryParent, setSelectedInventoryParent] = useState<Parent | null>(null);
    const [manualData, setManualData] = useState<ManualParentData>(initialManualGpState);
    const [isInventorySelectorOpen, setIsInventorySelectorOpen] = useState(false);

    // Manual form state
    const [manualUnique, setManualUnique] = useState<Skill | null>(null);
    const [manualUniqueStars, setManualUniqueStars] = useState<1 | 2 | 3>(3);
    const [currentWhiteSkill, setCurrentWhiteSkill] = useState<Skill | null>(null);
    const [currentWhiteStars, setCurrentWhiteStars] = useState<1 | 2 | 3>(3);

    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.type === 'unique'), [masterSkillList]);
    const normalSkills = useMemo(() => masterSkillList.filter(s => s.type !== 'unique' && s.rarity === 1), [masterSkillList]);

    const skillNameToGroupId = useMemo(() => {
        const map = new Map<string, number | undefined>();
        masterSkillList.forEach(skill => { if (skill.groupId) map.set(skill.name_en, skill.groupId); });
        return map;
    }, [masterSkillList]);

    const availableNormalSkills = useMemo(() => {
        const addedGroupIds = new Set<number>();
        manualData.whiteSparks.forEach(item => {
            const groupId = skillNameToGroupId.get(item.name);
            if (groupId) addedGroupIds.add(groupId);
        });
        return normalSkills.filter(skill => !skill.groupId || !addedGroupIds.has(skill.groupId));
    }, [manualData.whiteSparks, normalSkills, skillNameToGroupId]);

    useEffect(() => {
        if (isOpen) {
            if (grandparentToEdit) {
                if (typeof grandparentToEdit === 'number') {
                    setSelectionType('inventory');
                    const parent = appData.inventory.find(p => p.id === grandparentToEdit);
                    setSelectedInventoryParent(parent || null);
                    setManualData(initialManualGpState);
                } else {
                    setSelectionType('manual');
                    setManualData({ whiteSparks: [], ...grandparentToEdit });
                    if (grandparentToEdit.uniqueSparks.length > 0) {
                        const uSpark = grandparentToEdit.uniqueSparks[0];
                        const skill = masterSkillList.find(s => s.name_en === uSpark.name);
                        setManualUnique(skill || null);
                        setManualUniqueStars(uSpark.stars);
                    }
                }
            } else {
                setSelectionType('inventory');
                setSelectedInventoryParent(null);
                setManualData(initialManualGpState);
                setManualUnique(null);
                setManualUniqueStars(3);
                setCurrentWhiteSkill(null);
                setCurrentWhiteStars(3);
            }
        }
    }, [isOpen, grandparentToEdit, appData.inventory, masterSkillList]);

    const getDisplayName = (idOrName: string, type: 'uma' | 'skill') => {
        if (type === 'skill') return skillMapByName.get(idOrName)?.[displayNameProp] || idOrName;
        return umaMapById.get(idOrName)?.[displayNameProp] || idOrName;
    };

    const previewData = useMemo(() => {
        if (selectionType === 'inventory' && selectedInventoryParent) {
            const uma = umaMapById.get(selectedInventoryParent.umaId);
            return { image: uma?.image, name: getDisplayName(selectedInventoryParent.umaId, 'uma'), type: `Gen ${selectedInventoryParent.gen}` };
        }
        if (selectionType === 'manual' && manualData.umaId) {
            const uma = umaMapById.get(manualData.umaId);
            return { image: uma?.image, name: getDisplayName(manualData.umaId, 'uma'), type: t('enterManuallyBorrowed') };
        }
        return null;
    }, [selectionType, selectedInventoryParent, manualData, umaMapById, getDisplayName, t]);

    const handleSave = () => {
        if (selectionType === 'inventory' && selectedInventoryParent) {
            onSave(selectedInventoryParent.id);
        } else if (selectionType === 'manual' && manualData.umaId) {
            const finalManualData = { ...manualData };
            if (manualUnique) {
                finalManualData.uniqueSparks = [{ name: manualUnique.name_en, stars: manualUniqueStars }];
            } else {
                finalManualData.uniqueSparks = [];
            }
            onSave(finalManualData);
        }
        onClose();
    };
    
    const handleSelectFromInventory = (parent: Parent) => {
        setSelectedInventoryParent(parent);
        setIsInventorySelectorOpen(false);
    };
    
    const addManualSpark = (sparkType: 'uniqueSparks' | 'whiteSparks', skill: Skill | null, stars: 1|2|3) => {
        if (!skill) return;
        
        if (sparkType === 'whiteSparks') {
            const list = manualData.whiteSparks;
            if (!list.some(s => s.name === skill.name_en)) {
                setManualData(prev => ({ ...prev, whiteSparks: [...list, { name: skill.name_en, stars }] }));
            }
            setCurrentWhiteSkill(null);
        }
    };

    const removeManualSpark = (sparkType: 'uniqueSparks' | 'whiteSparks', name: string) => {
        if (sparkType === 'whiteSparks') {
            setManualData(prev => ({...prev, whiteSparks: manualData.whiteSparks.filter(s => s.name !== name)}));
        }
    };

    const isSaveDisabled = (selectionType === 'inventory' && !selectedInventoryParent) || (selectionType === 'manual' && !manualData.umaId);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
                <div className="gp-modal__preview">
                    {previewData?.image ? (
                        <img src={`${import.meta.env.BASE_URL}${previewData.image}`} alt={previewData.name} className="gp-modal__preview-image" />
                    ) : (
                        <div className="gp-modal__preview-placeholder"><FontAwesomeIcon icon={faUser} size="2x" /></div>
                    )}
                    <div>
                        <h4 className="gp-modal__preview-name">{previewData?.name || t('notSelected')}</h4>
                        <p className="gp-modal__preview-type">{previewData?.type}</p>
                    </div>
                </div>

                <div className="gp-selector__toggle">
                    <button type="button" className={`gp-selector__toggle-btn ${selectionType === 'inventory' ? 'gp-selector__toggle-btn--active' : ''}`} onClick={() => setSelectionType('inventory')}>{t('selectFromInventory')}</button>
                    <button type="button" className={`gp-selector__toggle-btn ${selectionType === 'manual' ? 'gp-selector__toggle-btn--active' : ''}`} onClick={() => setSelectionType('manual')}>{t('enterManuallyBorrowed')}</button>
                </div>

                {selectionType === 'inventory' ? (
                     <button className="button button--secondary w-full justify-center" onClick={() => setIsInventorySelectorOpen(true)}>
                        {t('roster:inventory.manageBtn')}...
                    </button>
                ) : (
                    <div className="gp-selector__manual-card">
                        <SearchableSelect items={masterUmaList} placeholder={t('selectUmaPlaceholder')} value={manualData.umaId ? getDisplayName(manualData.umaId, 'uma') : null} onSelect={(item) => setManualData(p => ({...p, umaId: (item as Uma).id}))} displayProp={displayNameProp} />
                        <div className="grid grid-cols-2 gap-2">
                            <select className="form__input" value={manualData.blueSpark.type} onChange={e => setManualData(p => ({...p, blueSpark: {...p.blueSpark, type: e.target.value as BlueSpark['type']}}))}>
                                {BLUE_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                            </select>
                            <select className="form__input" value={manualData.blueSpark.stars} onChange={e => setManualData(p => ({...p, blueSpark: {...p.blueSpark, stars: Number(e.target.value) as 1|2|3}}))}>
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select className="form__input" value={manualData.pinkSpark.type} onChange={e => setManualData(p => ({...p, pinkSpark: {...p.pinkSpark, type: e.target.value}}))}>
                                {PINK_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                            </select>
                            <select className="form__input" value={manualData.pinkSpark.stars} onChange={e => setManualData(p => ({...p, pinkSpark: {...p.pinkSpark, stars: Number(e.target.value) as 1|2|3}}))}>
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form__input-group">
                            <SearchableSelect items={uniqueSkills} placeholder={t('searchUniqueSkill')} value={manualUnique?.[displayNameProp] || null} onSelect={(item) => setManualUnique(item as Skill)} displayProp={displayNameProp} disabled={!!manualData.uniqueSparks.length && manualData.uniqueSparks[0]?.name !== manualUnique?.name_en} />
                            <select className="form__input w-24" value={manualUniqueStars} onChange={e => setManualUniqueStars(Number(e.target.value) as 1|2|3)} >
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                         <div className="form__section !border-t-0 !pt-0 mt-2">
                            <h4 className="form__section-title">{t('whiteSparksSection')}</h4>
                            <div className="form__obtained-sparks-container">
                                {manualData.whiteSparks.map(spark => (
                                    <div key={spark.name} className="spark-tag obtained-spark" data-spark-category="white">
                                        {getDisplayName(spark.name, 'skill')} {formatStars(spark.stars)}
                                        <button type="button" onClick={() => removeManualSpark('whiteSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <div className="form__input-group">
                                <SearchableSelect items={availableNormalSkills} placeholder={t('searchSkill')} value={currentWhiteSkill?.[displayNameProp] || null} onSelect={(item) => setCurrentWhiteSkill(item as Skill)} displayProp={displayNameProp} />
                                <select className="form__input w-24" value={currentWhiteStars} onChange={e => setCurrentWhiteStars(Number(e.target.value) as 1|2|3)}>
                                    {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button type="button" className="button button--secondary flex-shrink-0" onClick={() => addManualSpark('whiteSparks', currentWhiteSkill, currentWhiteStars)} disabled={!currentWhiteSkill}>
                                    {t('common:add')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={onClose}>{t('common:cancel')}</button>
                    <button className="button button--primary" onClick={handleSave} disabled={isSaveDisabled}>{t('confirmSelectionBtn')}</button>
                </div>
            </Modal>

            <InventoryModal 
                isOpen={isInventorySelectorOpen}
                onClose={() => setIsInventorySelectorOpen(false)}
                isSelectionMode={true}
                onSelectParent={handleSelectFromInventory}
            />
        </>
    );
};

export default SelectGrandparentModal;