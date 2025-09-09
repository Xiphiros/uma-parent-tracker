import { useState, useEffect, useMemo } from 'react';
import { Parent, NewParentData, BlueSpark, WhiteSpark, UniqueSpark, Uma } from '../types';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { formatStars } from '../utils/ui';
import { useTranslation } from 'react-i18next';

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
};

const AddParentModal = ({ isOpen, onClose, parentToEdit }: AddParentModalProps) => {
    const { t } = useTranslation(['modals', 'common', 'game']);
    const { masterUmaList, masterSkillList, addParent, updateParent, dataDisplayLanguage, umaMapById, skillMapByName } = useAppContext();
    
    const [formData, setFormData] = useState<NewParentData>(initialState);
    const [currentUniqueSkill, setCurrentUniqueSkill] = useState<any>(null);
    const [currentUniqueStars, setCurrentUniqueStars] = useState<1 | 2 | 3>(3);
    const [currentWhiteSkill, setCurrentWhiteSkill] = useState<any>(null);
    const [currentWhiteStars, setCurrentWhiteStars] = useState<1 | 2 | 3>(3);
    const [alertMessage, setAlertMessage] = useState('');

    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.type === 'unique'), [masterSkillList]);
    const normalSkills = useMemo(() => masterSkillList.filter(s => s.type !== 'unique' && s.rarity === 1), [masterSkillList]);

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
            setFormData({
                umaId: parentToEdit.umaId,
                name: parentToEdit.name,
                blueSpark: parentToEdit.blueSpark,
                pinkSpark: parentToEdit.pinkSpark,
                uniqueSparks: parentToEdit.uniqueSparks,
                whiteSparks: parentToEdit.whiteSparks,
            });
        } else {
            setFormData(initialState);
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

        if (parentToEdit) {
            updateParent({ ...parentToEdit, ...formData });
        } else {
            addParent(formData);
        }
        onClose();
    };
    
    const getDisplayName = (name: string, type: 'uma' | 'skill'): string => {
        if (type === 'skill') {
            const skill = skillMapByName.get(name);
            return skill ? skill[displayNameProp] : name;
        }
        return name; // Uma name display is handled by the SearchableSelect value prop
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