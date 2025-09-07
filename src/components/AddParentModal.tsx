import { useState, useEffect, useMemo } from 'react';
import { Parent, NewParentData, BlueSpark, WhiteSpark, UniqueSpark } from '../types';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import SearchableSelect from './common/SearchableSelect';
import { formatStars } from '../utils/ui';

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
  name: '',
  blueSpark: { type: 'Speed', stars: 1 },
  pinkSpark: { type: 'Turf', stars: 1 },
  uniqueSparks: [],
  whiteSparks: [],
};

const AddParentModal = ({ isOpen, onClose, parentToEdit }: AddParentModalProps) => {
    const { masterUmaList, masterSkillList, addParent, updateParent } = useAppContext();
    
    const [formData, setFormData] = useState<NewParentData>(initialState);
    const [currentUniqueSkill, setCurrentUniqueSkill] = useState<any>(null);
    const [currentUniqueStars, setCurrentUniqueStars] = useState<1 | 2 | 3>(3);
    const [currentWhiteSkill, setCurrentWhiteSkill] = useState<any>(null);
    const [currentWhiteStars, setCurrentWhiteStars] = useState<1 | 2 | 3>(3);

    const uniqueSkills = useMemo(() => masterSkillList.filter(s => s.type === 'unique'), [masterSkillList]);
    const normalSkills = useMemo(() => masterSkillList.filter(s => s.type !== 'unique' && s.rarity === 1), [masterSkillList]);

    useEffect(() => {
        if (parentToEdit) {
            setFormData({
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

    const handleInputChange = (field: keyof NewParentData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
        if (!formData.name) {
            alert('Please select an Uma Name.');
            return;
        }

        if (parentToEdit) {
            updateParent({ ...parentToEdit, ...formData });
        } else {
            addParent(formData);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={parentToEdit ? 'Edit Parent' : 'Add New Parent'} size="lg">
            <form onSubmit={handleSubmit} className="form space-y-4">
                 <div>
                    <label className="form__label form__label--xs">Uma Name</label>
                    <SearchableSelect 
                        items={masterUmaList}
                        placeholder="Select uma name..."
                        value={formData.name || null}
                        onSelect={(item) => handleInputChange('name', item.name_en)}
                    />
                </div>

                <div className="form__section">
                    <h4 className="form__section-title">Blue Spark</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form__label form__label--xs">Type</label>
                            <select className="form__input" value={formData.blueSpark.type} onChange={e => handleSparkChange('blueSpark', 'type', e.target.value as BlueSpark['type'])}>
                                {BLUE_SPARK_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form__label form__label--xs">Stars</label>
                            <select className="form__input" value={formData.blueSpark.stars} onChange={e => handleSparkChange('blueSpark', 'stars', Number(e.target.value) as 1|2|3)}>
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form__section">
                    <h4 className="form__section-title">Pink Spark</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form__label form__label--xs">Type</label>
                            <select className="form__input" value={formData.pinkSpark.type} onChange={e => handleSparkChange('pinkSpark', 'type', e.target.value)}>
                                {PINK_SPARK_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form__label form__label--xs">Stars</label>
                            <select className="form__input" value={formData.pinkSpark.stars} onChange={e => handleSparkChange('pinkSpark', 'stars', Number(e.target.value) as 1|2|3)}>
                                {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form__section">
                    <h4 className="form__section-title">Obtained Unique Sparks</h4>
                    <div className="form__obtained-sparks-container">
                        {formData.uniqueSparks.map(spark => (
                            <div key={spark.name} className="spark-tag obtained-spark" data-spark-category="unique">
                                {spark.name} {formatStars(spark.stars)}
                                <button type="button" onClick={() => removeObtainedSpark('uniqueSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="form__input-group">
                        <SearchableSelect items={uniqueSkills} placeholder="Search unique skill..." value={currentUniqueSkill?.name_en || null} onSelect={setCurrentUniqueSkill} />
                        <select className="form__input w-24" value={currentUniqueStars} onChange={e => setCurrentUniqueStars(Number(e.target.value) as 1|2|3)}>
                            {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button type="button" className="button button--secondary flex-shrink-0" onClick={() => addObtainedSpark('uniqueSparks', currentUniqueSkill, currentUniqueStars)}>Add</button>
                    </div>
                </div>

                <div className="form__section">
                    <h4 className="form__section-title">Obtained White Sparks</h4>
                    <div className="form__obtained-sparks-container">
                        {formData.whiteSparks.map(spark => (
                            <div key={spark.name} className="spark-tag obtained-spark" data-spark-category="white">
                                {spark.name} {formatStars(spark.stars)}
                                <button type="button" onClick={() => removeObtainedSpark('whiteSparks', spark.name)} className="obtained-spark__remove-btn">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="form__input-group">
                        <SearchableSelect items={normalSkills} placeholder="Search skill..." value={currentWhiteSkill?.name_en || null} onSelect={setCurrentWhiteSkill} />
                        <select className="form__input w-24" value={currentWhiteStars} onChange={e => setCurrentWhiteStars(Number(e.target.value) as 1|2|3)}>
                             {STAR_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button type="button" className="button button--secondary flex-shrink-0" onClick={() => addObtainedSpark('whiteSparks', currentWhiteSkill, currentWhiteStars)}>Add</button>
                    </div>
                </div>

                <div className="dialog-modal__footer">
                    <button type="button" className="button button--neutral" onClick={onClose}>Cancel</button>
                    <button type="submit" className="button button--primary">
                        {parentToEdit ? 'Update Parent' : 'Calculate Score & Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddParentModal;