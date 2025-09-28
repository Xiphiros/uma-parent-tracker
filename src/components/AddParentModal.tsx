import { useState, useEffect, useMemo } from 'react';
import { Parent, NewParentData, BlueSpark, WhiteSpark, UniqueSpark, Uma, Grandparent, Skill } from '../types';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { formatStars } from '../utils/ui';
import { useTranslation } from 'react-i18next';
import './AddParentModal.css';
import SelectGrandparentModal from './SelectGrandparentModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { getExcludedCharacterIds } from '../utils/selectionExclusion';
import { calculateScore } from '../utils/scoring';

interface AddParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentToEdit?: Parent | null;
}

const BLUE_SPARK_TYPES: BlueSpark['type'][] = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_TYPES = [
  'Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long',
  'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'
];

const STAR_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3];

const initialState: NewParentData = {
  umaId: '', name: '',
  blueSpark: { type: 'Speed', stars: 1 }, pinkSpark: { type: 'Turf', stars: 1 },
  uniqueSparks: [], whiteSparks: [],
  grandparent1: undefined, grandparent2: undefined, isBorrowed: false,
};

type GrandparentSlot = 'grandparent1' | 'grandparent2';

const AddParentModal = ({ isOpen, onClose, parentToEdit }: AddParentModalProps) => {
    const { t } = useTranslation(['modals', 'common', 'game', 'roster']);
    const { getActiveProfile, masterUmaListWithDisplayName, masterSkillList, addParent, updateParent, dataDisplayLanguage, umaMapById, skillMapByName, appData, getUmaDisplayName } = useAppContext();
    
    const [formData, setFormData] = useState<NewParentData>(initialState);
    const [currentUniqueSkill, setCurrentUniqueSkill] = useState<Skill | null>(null);
    const [currentUniqueStars, setCurrentUniqueStars] = useState<1 | 2 | 3>(3);
    const [currentWhiteSkill, setCurrentWhiteSkill] = useState<Skill | null>(null);
    const [currentWhiteStars, setCurrentWhiteStars] = useState<1 | 2 | 3>(3);
    const [alertMessage, setAlertMessage] = useState('');
    const [liveScore, setLiveScore] = useState(0);
    
    const [isGpModalOpen, setIsGpModalOpen] = useState(false);
    const [activeGpSlot, setActiveGpSlot] = useState<GrandparentSlot | null>(null);
    const [excludedGpCharacterIds, setExcludedGpCharacterIds] = useState<Set<string>>(new Set());

    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.category === 'unique'), [masterSkillList]);
    const normalSkills = useMemo(() => masterSkillList.filter(s => s.category === 'white' && s.factorType === 4), [masterSkillList]);

    const mainParentImage = useMemo(() => {
        if (!formData.umaId) return null;
        const uma = umaMapById.get(formData.umaId);
        return uma?.image ? `${import.meta.env.BASE_URL}${uma.image}` : null;
    }, [formData.umaId, umaMapById]);

    const availableNormalSkills = useMemo(() => {
        const addedGroupIds = new Set<number>();
        formData.whiteSparks.forEach(item => {
            const skillData = skillMapByName.get(item.name);
            if (skillData) addedGroupIds.add(skillData.id);
        });
        return normalSkills.filter(skill => !addedGroupIds.has(skill.id));
    }, [formData.whiteSparks, normalSkills, skillMapByName]);

    const isUniqueSparkSelected = formData.uniqueSparks.length > 0;

    useEffect(() => {
        if (isOpen) {
            if (parentToEdit) {
                setFormData({ ...initialState, ...parentToEdit });
            } else {
                setFormData(initialState);
            }
        }
    }, [parentToEdit, isOpen]);

    useEffect(() => {
        const activeProfile = getActiveProfile();
        if (activeProfile?.goal) {
            const tempParent: Parent = {
                ...formData,
                id: parentToEdit?.id || 0,
                gen: parentToEdit?.gen || 0,
                score: 0,
                server: parentToEdit?.server || 'jp'
            };
            const score = calculateScore(tempParent, activeProfile.goal, appData.inventory, skillMapByName);
            setLiveScore(score);
        } else {
            setLiveScore(0);
        }
    }, [formData, getActiveProfile, appData.inventory, parentToEdit, skillMapByName]);

    const handleUmaSelect = (item: Uma) => {
        const name = getUmaDisplayName(item);
        setFormData(prev => ({ ...prev, name, umaId: item.id }));
    };
    const handleSparkChange = (sparkType: 'blueSpark' | 'pinkSpark', part: 'type' | 'stars', value: string | number) => {
        setFormData(prev => ({ ...prev, [sparkType]: { ...prev[sparkType], [part]: value } }));
    };
    
    const addObtainedSpark = (sparkType: 'uniqueSparks' | 'whiteSparks', skill: Skill | null, stars: 1|2|3) => {
        if (!skill) return;
        const list = formData[sparkType] as (UniqueSpark[] | WhiteSpark[]);
        if (!list.some(s => s.name === skill.name_en)) {
            setFormData(prev => ({...prev, [sparkType]: [...list, { name: skill.name_en, stars }]}));
        }
        if (sparkType === 'uniqueSparks') setCurrentUniqueSkill(null); else setCurrentWhiteSkill(null);
    };
    
    const removeObtainedSpark = (sparkType: 'uniqueSparks' | 'whiteSparks', name: string) => {
        const list = formData[sparkType] as (UniqueSpark[] | WhiteSpark[]);
        setFormData(prev => ({...prev, [sparkType]: list.filter(s => s.name !== name)}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.umaId) {
            setAlertMessage(t('selectUmaAlert'));
            return;
        }
        try {
            if (parentToEdit) {
                updateParent({ ...parentToEdit, ...formData });
            } else {
                addParent(formData, getActiveProfile()?.id);
            }
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            setAlertMessage(message);
        }
    };
    
    const getSkillDisplayName = (name_en: string): string => {
        const skill = skillMapByName.get(name_en);
        return skill ? skill[displayNameProp] : name_en;
    };

    const handleOpenGpModal = (slot: GrandparentSlot) => {
        const idsToExclude = getExcludedCharacterIds({
            context: 'grandparent',
            activeGpSlot: slot,
            parentToEdit: parentToEdit || null,
            grandparent1: formData.grandparent1,
            grandparent2: formData.grandparent2,
            umaMapById,
            inventory: appData.inventory
        });
        setExcludedGpCharacterIds(idsToExclude);
        setActiveGpSlot(slot);
        setIsGpModalOpen(true);
    };

    const handleSaveGrandparent = (data: Grandparent) => {
        if (activeGpSlot) {
            setFormData(prev => ({ ...prev, [activeGpSlot]: data }));
        }
        setIsGpModalOpen(false);
        setActiveGpSlot(null);
    };

    const getGrandparentAvatar = (gp: Grandparent | undefined): string | null => {
        if (!gp) return null;
        let umaId: string | undefined;
        if (typeof gp === 'number') {
            const ownedParent = appData.inventory.find(p => p.id === gp);
            umaId = ownedParent?.umaId;
        } else if (gp.umaId) {
            umaId = gp.umaId;
        }
        
        if (umaId) {
            const umaData = umaMapById.get(umaId);
            return umaData?.image ? `${import.meta.env.BASE_URL}${umaData.image}` : null;
        }
        return null;
    };

    const renderGrandparentDisplay = (slot: GrandparentSlot) => {
        const gp = formData[slot];
        const avatarUrl = getGrandparentAvatar(gp);
        let name = t('notSelected');
        if (gp) {
            if (typeof gp === 'number') {
                const parent = appData.inventory.find(p => p.id === gp);
                if (parent) {
                    const uma = umaMapById.get(parent.umaId);
                    if (uma) name = getUmaDisplayName(uma);
                }
            } else if (gp.umaId) {
                const uma = umaMapById.get(gp.umaId);
                if (uma) name = getUmaDisplayName(uma);
            } else {
                name = t('enterManually');
            }
        }
        return (
            <div>
                <h5 className="form__label mb-2">{t(slot)}</h5>
                <div className="form__static-display">
                    <div className="flex items-center gap-2">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="form__static-display-image" />
                        ) : (
                            <div className="form__static-display-image-placeholder">
                                <FontAwesomeIcon icon={faUser} />
                            </div>
                        )}
                        <span className={`form__static-display-text ${!gp ? 'form__static-display-text--placeholder' : ''}`}>{name}</span>
                    </div>
                    <button type="button" className="button button--secondary button--small" onClick={() => handleOpenGpModal(slot)}>
                        {gp ? t('changeBtn') : t('selectBtn')}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={parentToEdit ? t('editParentTitle') : t('addParentTitle')} size="lg">
                <form onSubmit={handleSubmit} className="form space-y-4">
                    <div className="add-parent-modal__header">
                        {mainParentImage ? (
                            <img src={mainParentImage} alt="" className="add-parent-modal__portrait" />
                        ) : (
                            <div className="add-parent-modal__portrait-placeholder">
                                <FontAwesomeIcon icon={faUser} size="2x" />
                            </div>
                        )}
                        <div className="add-parent-modal__main-info">
                            <label className="form__label form__label--xs">{t('umaNameLabel')}</label>
                            <SearchableSelect 
                                items={masterUmaListWithDisplayName}
                                placeholder={t('selectUmaPlaceholder')}
                                value={formData.umaId && umaMapById.get(formData.umaId) ? getUmaDisplayName(umaMapById.get(formData.umaId)!) : null}
                                onSelect={(item) => handleUmaSelect(item as Uma)}
                                displayProp="displayName"
                            />
                        </div>
                    </div>

                    <div className="form__section !border-t-0 !pt-0">
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="form__checkbox"
                                checked={formData.isBorrowed}
                                onChange={(e) => setFormData(prev => ({ ...prev, isBorrowed: e.target.checked }))}
                            />
                            <span className="form__label !mb-0">{t('markAsBorrowed')}</span>
                        </label>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title">{t('blueSparkSection')}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form__label form__label--xs">{t('typeLabel')}</label>
                                <select className="form__input" value={formData.blueSpark.type} onChange={e => handleSparkChange('blueSpark', 'type', e.target.value as BlueSpark['type'])}>
                                    {BLUE_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form__label form__label--xs">{t('starsLabel')}</label>
                                <select className="form__input" value={formData.blueSpark.stars} onChange={e => handleSparkChange('blueSpark', 'stars', Number(e.target.value) as 1|2|3)}>
                                    {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title">{t('pinkSparkSection')}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form__label form__label--xs">{t('typeLabel')}</label>
                                <select className="form__input" value={formData.pinkSpark.type} onChange={e => handleSparkChange('pinkSpark', 'type', e.target.value)}>
                                    {PINK_SPARK_TYPES.map(type => <option key={type} value={type}>{t(type, { ns: 'game' })}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form__label form__label--xs">{t('starsLabel')}</label>
                                <select className="form__input" value={formData.pinkSpark.stars} onChange={e => handleSparkChange('pinkSpark', 'stars', Number(e.target.value) as 1|2|3)}>
                                    {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title">{t('uniqueSparksSection')}</h4>
                        <div className="form__obtained-sparks-container">
                            {formData.uniqueSparks.map(spark => (
                                <div key={spark.name} className="spark-tag obtained-spark" data-spark-category="unique">
                                    {getSkillDisplayName(spark.name)} {formatStars(spark.stars)}
                                    <button type="button" onClick={() => removeObtainedSpark('uniqueSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                                </div>
                            ))}
                        </div>
                        <div className="form__input-group">
                            <SearchableSelect
                                items={uniqueSkills}
                                placeholder={t('searchUniqueSkill')}
                                value={currentUniqueSkill?.[displayNameProp] || null}
                                onSelect={(item) => setCurrentUniqueSkill(item as Skill)}
                                displayProp={displayNameProp}
                                disabled={isUniqueSparkSelected}
                            />
                            <select
                                className="form__input w-24"
                                value={currentUniqueStars}
                                onChange={e => setCurrentUniqueStars(Number(e.target.value) as 1|2|3)}
                                disabled={isUniqueSparkSelected}
                            >
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <button
                                type="button"
                                className="button button--secondary flex-shrink-0"
                                onClick={() => addObtainedSpark('uniqueSparks', currentUniqueSkill, currentUniqueStars)}
                                disabled={isUniqueSparkSelected || !currentUniqueSkill}
                            >
                                {t('common:add')}
                            </button>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title">{t('whiteSparksSection')}</h4>
                        <div className="form__obtained-sparks-container">
                            {formData.whiteSparks.map(spark => (
                                <div key={spark.name} className="spark-tag obtained-spark" data-spark-category="white">
                                    {getSkillDisplayName(spark.name)} {formatStars(spark.stars)}
                                    <button type="button" onClick={() => removeObtainedSpark('whiteSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                                </div>
                            ))}
                        </div>
                        <div className="form__input-group">
                            <SearchableSelect items={availableNormalSkills} placeholder={t('searchSkill')} value={currentWhiteSkill?.[displayNameProp] || null} onSelect={(item) => setCurrentWhiteSkill(item as Skill)} displayProp={displayNameProp} />
                            <select className="form__input w-24" value={currentWhiteStars} onChange={e => setCurrentWhiteStars(Number(e.target.value) as 1|2|3)}>
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <button
                                type="button"
                                className="button button--secondary flex-shrink-0"
                                onClick={() => addObtainedSpark('whiteSparks', currentWhiteSkill, currentWhiteStars)}
                                disabled={!currentWhiteSkill}
                            >
                                {t('common:add')}
                            </button>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title">{t('legacyOriginSection')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {renderGrandparentDisplay('grandparent1')}
                           {renderGrandparentDisplay('grandparent2')}
                        </div>
                    </div>
                    <div className="dialog-modal__footer add-parent-modal__footer">
                        <div className="add-parent-modal__score-display">
                            <span className="add-parent-modal__score-value">{liveScore} {t('roster:parentCard.pts')}</span>
                        </div>
                        <div className="add-parent-modal__footer-actions">
                            <button type="button" className="button button--neutral" onClick={onClose}>{t('common:cancel')}</button>
                            <button type="submit" className="button button--primary">
                                {parentToEdit ? t('updateParentBtn') : t('saveParentBtn')}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
            
            {isGpModalOpen && (
                <SelectGrandparentModal 
                    isOpen={isGpModalOpen}
                    onClose={() => setIsGpModalOpen(false)}
                    onSave={handleSaveGrandparent}
                    title={t('selectGrandparentTitle')}
                    grandparentToEdit={activeGpSlot ? formData[activeGpSlot] : null}
                    excludedCharacterIds={excludedGpCharacterIds}
                />
            )}

            <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage('')} title={t('inputRequiredTitle')}>
                <p className="dialog-modal__message">{alertMessage}</p>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={() => setAlertMessage('')}>{t('common:ok')}</button>
                </div>
            </Modal>
        </>
    );
};

export default AddParentModal;