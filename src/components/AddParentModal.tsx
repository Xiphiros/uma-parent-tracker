import { useState, useEffect, useMemo } from 'react';
import { Parent, NewParentData, BlueSpark, WhiteSpark, UniqueSpark, Uma, ManualParentData } from '../types';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { formatStars } from '../utils/ui';
import { useTranslation } from 'react-i18next';
import './AddParentModal.css';

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
  umaId: '',
  name: '',
  blueSpark: { type: 'Speed', stars: 1 },
  pinkSpark: { type: 'Turf', stars: 1 },
  uniqueSparks: [],
  whiteSparks: [],
  grandparent1: undefined,
  grandparent2: undefined,
};

const initialManualGpState: ManualParentData = {
    umaId: undefined,
    blueSpark: { type: 'Speed', stars: 1 },
    pinkSpark: { type: 'Turf', stars: 1 },
    uniqueSparks: [],
};

type GrandparentSlot = 'grandparent1' | 'grandparent2';
type GrandparentType = 'inventory' | 'manual';

const AddParentModal = ({ isOpen, onClose, parentToEdit }: AddParentModalProps) => {
    const { t } = useTranslation(['modals', 'common', 'game']);
    const { getActiveProfile, masterUmaList, masterSkillList, addParent, updateParent, dataDisplayLanguage, umaMapById, skillMapByName, appData, activeServer } = useAppContext();
    
    const [formData, setFormData] = useState<NewParentData>(initialState);
    const [currentUniqueSkill, setCurrentUniqueSkill] = useState<any>(null);
    const [currentUniqueStars, setCurrentUniqueStars] = useState<1 | 2 | 3>(3);
    const [currentWhiteSkill, setCurrentWhiteSkill] = useState<any>(null);
    const [currentWhiteStars, setCurrentWhiteStars] = useState<1 | 2 | 3>(3);
    const [alertMessage, setAlertMessage] = useState('');

    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    // Grandparent state
    const [gp1Type, setGp1Type] = useState<GrandparentType | null>(null);
    const [gp2Type, setGp2Type] = useState<GrandparentType | null>(null);
    const [gp1ManualData, setGp1ManualData] = useState<ManualParentData>(initialManualGpState);
    const [gp2ManualData, setGp2ManualData] = useState<ManualParentData>(initialManualGpState);
    const [gp1ManualUnique, setGp1ManualUnique] = useState<any>(null);
    const [gp2ManualUnique, setGp2ManualUnique] = useState<any>(null);

    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.type === 'unique'), [masterSkillList]);
    const normalSkills = useMemo(() => masterSkillList.filter(s => s.type !== 'unique' && s.rarity === 1), [masterSkillList]);
    const inventory = useMemo(() => appData.inventory.filter(p => p.server === activeServer), [appData.inventory, activeServer]);

    const skillNameToGroupId = useMemo(() => {
        const map = new Map<string, number | undefined>();
        masterSkillList.forEach(skill => {
            if (skill.groupId) {
                map.set(skill.name_en, skill.groupId);
            }
        });
        return map;
    }, [masterSkillList]);

    const availableNormalSkills = useMemo(() => {
        const addedGroupIds = new Set<number>();
        formData.whiteSparks.forEach(item => {
            const groupId = skillNameToGroupId.get(item.name);
            if (groupId) {
                addedGroupIds.add(groupId);
            }
        });
        
        return normalSkills.filter(skill => 
            !skill.groupId || !addedGroupIds.has(skill.groupId)
        );
    }, [formData.whiteSparks, normalSkills, skillNameToGroupId]);

    const isUniqueSparkSelected = formData.uniqueSparks.length > 0;

    useEffect(() => {
        if (parentToEdit) {
            setFormData({ ...initialState, ...parentToEdit });
        } else {
            setFormData(initialState);
            setGp1Type(null);
            setGp2Type(null);
        }
    }, [parentToEdit, isOpen]);

    const handleUmaSelect = (item: Uma) => {
        setFormData(prev => ({ ...prev, name: item.name_en, umaId: item.id }));
    };

    const handleSparkChange = (sparkType: 'blueSpark' | 'pinkSpark', part: 'type' | 'stars', value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [sparkType]: { ...prev[sparkType], [part]: value }
        }));
    };
    
    const addObtainedSpark = (sparkType: 'uniqueSparks' | 'whiteSparks', skill: any, stars: 1|2|3) => {
        if (!skill) return;
        const list = formData[sparkType] as (UniqueSpark[] | WhiteSpark[]);
        if (!list.some(s => s.name === skill.name_en)) {
            const newList = [...list, { name: skill.name_en, stars }];
            setFormData(prev => ({...prev, [sparkType]: newList}));
        }
        if (sparkType === 'uniqueSparks') setCurrentUniqueSkill(null);
        else setCurrentWhiteSkill(null);
    };
    
    const removeObtainedSpark = (sparkType: 'uniqueSparks' | 'whiteSparks', name: string) => {
        const list = formData[sparkType] as (UniqueSpark[] | WhiteSpark[]);
        const newList = list.filter(s => s.name !== name);
        setFormData(prev => ({...prev, [sparkType]: newList}));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.umaId) {
            setAlertMessage(t('selectUmaAlert'));
            return;
        }

        const finalData = { ...formData };
        if (gp1Type === 'inventory' && typeof finalData.grandparent1 === 'number') { /* No action needed */ }
        else if (gp1Type === 'manual') { finalData.grandparent1 = gp1ManualData; }
        else { delete finalData.grandparent1; }

        if (gp2Type === 'inventory' && typeof finalData.grandparent2 === 'number') { /* No action needed */ }
        else if (gp2Type === 'manual') { finalData.grandparent2 = gp2ManualData; }
        else { delete finalData.grandparent2; }

        if (parentToEdit) {
            updateParent({ ...parentToEdit, ...finalData });
        } else {
            const activeProfile = getActiveProfile();
            addParent(finalData, activeProfile?.id);
        }
        onClose();
    };
    
    const getDisplayName = (idOrName: string, type: 'uma' | 'skill'): string => {
        if (type === 'skill') {
            const skill = skillMapByName.get(idOrName);
            return skill ? skill[displayNameProp] : idOrName;
        }
        const uma = umaMapById.get(idOrName);
        return uma?.[displayNameProp] || idOrName;
    };
    
    const renderGrandparentSelector = (slot: GrandparentSlot) => {
        const type = slot === 'grandparent1' ? gp1Type : gp2Type;
        const setType = slot === 'grandparent1' ? setGp1Type : setGp2Type;
        const manualData = slot === 'grandparent1' ? gp1ManualData : gp2ManualData;
        const setManualData = slot === 'grandparent1' ? setGp1ManualData : setGp2ManualData;
        const manualUnique = slot === 'grandparent1' ? gp1ManualUnique : gp2ManualUnique;
        const setManualUnique = slot === 'grandparent1' ? setGp1ManualUnique : setGp2ManualUnique;

        const handleManualSparkChange = (sparkType: 'blueSpark' | 'pinkSpark', part: 'type' | 'stars', value: any) => {
            setManualData(prev => ({...prev, [sparkType]: {...prev[sparkType], [part]: value}}));
        };
        
        const handleManualUniqueChange = (skill: any) => {
            setManualUnique(skill);
            setManualData(prev => ({...prev, uniqueSparks: skill ? [{name: skill.name_en, stars: 3}] : []}));
        };

        const inventoryOptions = inventory.map(p => ({...p, name_en: getDisplayName(p.umaId, 'uma') + ` (G${p.gen})`, name_jp: getDisplayName(p.umaId, 'uma') + ` (G${p.gen})` }));
        
        return (
            <div className="gp-selector">
                <h5 className="form__label mb-2">{t(slot)}</h5>
                <div className="gp-selector__toggle">
                    <button type="button" className={`gp-selector__toggle-btn ${type === 'inventory' ? 'gp-selector__toggle-btn--active' : ''}`} onClick={() => setType('inventory')}>{t('selectFromInventory')}</button>
                    <button type="button" className={`gp-selector__toggle-btn ${type === 'manual' ? 'gp-selector__toggle-btn--active' : ''}`} onClick={() => setType('manual')}>{t('enterManually')}</button>
                </div>
                {type === 'inventory' && (
                    <SearchableSelect 
                        items={inventoryOptions}
                        placeholder={t('selectParentPlaceholder')}
                        value={formData[slot] ? getDisplayName(inventory.find(p=>p.id === formData[slot])!.umaId, 'uma') : null}
                        onSelect={(item) => setFormData(prev => ({...prev, [slot]: (item as unknown as Parent).id}))}
                        displayProp={displayNameProp}
                    />
                )}
                {type === 'manual' && (
                    <div className="gp-selector__manual-card">
                        <SearchableSelect items={masterUmaList} placeholder={t('selectUmaPlaceholder')} value={manualData.umaId ? getDisplayName(manualData.umaId, 'uma') : null} onSelect={(item) => setManualData(p => ({...p, umaId: (item as Uma).id}))} displayProp={displayNameProp} />
                        <div className="grid grid-cols-2 gap-2">
                            <select className="form__input" value={manualData.blueSpark.type} onChange={e => handleManualSparkChange('blueSpark', 'type', e.target.value)}>
                                {BLUE_SPARK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                             <select className="form__input" value={manualData.pinkSpark.type} onChange={e => handleManualSparkChange('pinkSpark', 'type', e.target.value)}>
                                {PINK_SPARK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <SearchableSelect items={uniqueSkills} placeholder={t('searchUniqueSkill')} value={manualUnique?.[displayNameProp] || null} onSelect={handleManualUniqueChange} displayProp={displayNameProp} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={parentToEdit ? t('editParentTitle') : t('addParentTitle')} size="lg">
                <form onSubmit={handleSubmit} className="form space-y-4">
                    <div>
                        <label className="form__label form__label--xs">{t('umaNameLabel')}</label>
                        <SearchableSelect 
                            items={masterUmaList}
                            placeholder={t('selectUmaPlaceholder')}
                            value={formData.umaId ? umaMapById.get(formData.umaId)?.[displayNameProp] || null : null}
                            onSelect={(item) => handleUmaSelect(item as Uma)}
                            displayProp={displayNameProp}
                        />
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
                                    {getDisplayName(spark.name, 'skill')} {formatStars(spark.stars)}
                                    <button type="button" onClick={() => removeObtainedSpark('uniqueSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                                </div>
                            ))}
                        </div>
                        <div className="form__input-group">
                            <SearchableSelect
                                items={uniqueSkills}
                                placeholder={t('searchUniqueSkill')}
                                value={currentUniqueSkill?.[displayNameProp] || null}
                                onSelect={setCurrentUniqueSkill}
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
                                    {getDisplayName(spark.name, 'skill')} {formatStars(spark.stars)}
                                    <button type="button" onClick={() => removeObtainedSpark('whiteSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                                </div>
                            ))}
                        </div>
                        <div className="form__input-group">
                            <SearchableSelect items={availableNormalSkills} placeholder={t('searchSkill')} value={currentWhiteSkill?.[displayNameProp] || null} onSelect={setCurrentWhiteSkill} displayProp={displayNameProp} />
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
                           {renderGrandparentSelector('grandparent1')}
                           {renderGrandparentSelector('grandparent2')}
                        </div>
                    </div>

                    <div className="dialog-modal__footer">
                        <button type="button" className="button button--neutral" onClick={onClose}>{t('common:cancel')}</button>
                        <button type="submit" className="button button--primary">
                            {parentToEdit ? t('updateParentBtn') : t('calculateScoreBtn')}
                        </button>
                    </div>
                </form>
            </Modal>
            
            <Modal
                isOpen={!!alertMessage}
                onClose={() => setAlertMessage('')}
                title={t('inputRequiredTitle')}
            >
                <p className="dialog-modal__message">{alertMessage}</p>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={() => setAlertMessage('')}>{t('common:ok')}</button>
                </div>
            </Modal>
        </>
    );
};

export default AddParentModal;