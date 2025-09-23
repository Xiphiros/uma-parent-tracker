import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Goal, WishlistItem } from '../types';
import MultiSelect from './common/MultiSelect';
import WishlistSection from './common/WishlistSection';
import { useTranslation } from 'react-i18next';

const BLUE_SPARK_OPTIONS = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
const PINK_SPARK_OPTIONS = [
  'Turf', 'Dirt', 'Sprint', 'Mile', 'Medium', 'Long',
  'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'
];

const GoalDefinition = () => {
    const { t } = useTranslation(['goal', 'game']);
    const { getActiveProfile, updateGoal, masterSkillList, updateWishlistItem } = useAppContext();
    const activeProfile = getActiveProfile();
    const goal = activeProfile?.goal;

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

    const availableUniqueSkills = useMemo(() => {
        if (!goal) return uniqueSkills;
        const wishlistedNames = new Set(goal.uniqueWishlist.map(item => item.name));
        return uniqueSkills.filter(skill => !wishlistedNames.has(skill.name_en));
    }, [goal, uniqueSkills]);

    const availableNormalSkills = useMemo(() => {
        if (!goal) return normalSkills;
        
        const wishlistedGroupIds = new Set<number>();
        goal.wishlist.forEach(item => {
            const groupId = skillNameToGroupId.get(item.name);
            if (groupId) {
                wishlistedGroupIds.add(groupId);
            }
        });

        return normalSkills.filter(skill => 
            !skill.groupId || !wishlistedGroupIds.has(skill.groupId)
        );
    }, [goal, normalSkills, skillNameToGroupId]);

    if (!goal) return null;

    const isUniqueWishlistFull = goal.uniqueWishlist.length >= 6;

    const handleGoalChange = (changedValues: Partial<Goal>) => {
        updateGoal({ ...goal, ...changedValues });
    };
    
    const handleWishlistAdd = (listName: 'wishlist' | 'uniqueWishlist', item: WishlistItem) => {
        const currentList = goal[listName] as WishlistItem[];
        if (!currentList.some(w => w.name.toLowerCase() === item.name.toLowerCase())) {
            handleGoalChange({ [listName]: [...currentList, item] });
        }
    };
    
    const handleWishlistRemove = (listName: 'wishlist' | 'uniqueWishlist', itemName: string) => {
        const currentList = goal[listName] as WishlistItem[];
        handleGoalChange({ [listName]: currentList.filter(w => w.name !== itemName) });
    };

    const handleWishlistUpdate = (listName: 'wishlist' | 'uniqueWishlist', oldName: string, newItem: WishlistItem) => {
        updateWishlistItem(listName, oldName, newItem);
    };

    const handlePrimaryBlueChange = (index: 0 | 1, value: string) => {
        const newPrimaryBlue: [string, string] = [...goal.primaryBlue];
        const otherIndex = index === 0 ? 1 : 0;
        let newSecondaryBlue = goal.secondaryBlue;

        // Swap if the new value is already in the other primary slot
        if (value === newPrimaryBlue[otherIndex]) {
            newPrimaryBlue[otherIndex] = newPrimaryBlue[index];
        }
        newPrimaryBlue[index] = value;

        // If the new value conflicts with secondary, clear secondary
        if (value === newSecondaryBlue) {
            newSecondaryBlue = '';
        }

        handleGoalChange({ primaryBlue: newPrimaryBlue, secondaryBlue: newSecondaryBlue });
    };

    const handleSecondaryBlueChange = (value: string) => {
        // If the value is already a primary, do nothing (or clear it from primary)
        if (goal.primaryBlue.includes(value)) {
            return;
        }
        handleGoalChange({ secondaryBlue: value });
    };

    const translatedOptions = (options: string[]) => options.map(opt => ({
        value: opt,
        label: t(opt, { ns: 'game' })
    }));

    return (
        <section id="goal-definition" className="card">
            <h2 className="card__title">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                {t('title')}
            </h2>
            <div className="space-y-4">
                <div>
                    <h3 className="form__section-title mb-2">{t('primaryBlue')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form__label form__label--xs">{t('primaryStat1')}</label>
                            <select className="form__input" value={goal.primaryBlue[0]} onChange={e => handlePrimaryBlueChange(0, e.target.value)}>
                                {BLUE_SPARK_OPTIONS.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="form__label form__label--xs">{t('primaryStat2')}</label>
                            <select className="form__input" value={goal.primaryBlue[1]} onChange={e => handlePrimaryBlueChange(1, e.target.value)}>
                                {BLUE_SPARK_OPTIONS.map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="mt-2">
                        <label className="form__label form__label--xs">{t('secondaryStat')}</label>
                        <select className="form__input" value={goal.secondaryBlue} onChange={e => handleSecondaryBlueChange(e.target.value)}>
                            <option value="">{t('noneSelected')}</option>
                            {BLUE_SPARK_OPTIONS.filter(opt => !goal.primaryBlue.includes(opt)).map(opt => <option key={opt} value={opt}>{t(opt, { ns: 'game' })}</option>)}
                        </select>
                    </div>
                </div>
                <div className="border-t pt-4">
                    <h3 className="form__section-title mb-2">{t('primaryPink')}</h3>
                    <MultiSelect
                        options={translatedOptions(PINK_SPARK_OPTIONS)}
                        selectedValues={goal.primaryPink}
                        onChange={(selected) => handleGoalChange({ primaryPink: selected })}
                    />
                </div>
                
                <WishlistSection 
                    title={t('uniqueWishlist')}
                    wishlist={goal.uniqueWishlist}
                    skillList={availableUniqueSkills}
                    onAdd={(item) => handleWishlistAdd('uniqueWishlist', item)}
                    onRemove={(name) => handleWishlistRemove('uniqueWishlist', name)}
                    onUpdate={(oldName, newItem) => handleWishlistUpdate('uniqueWishlist', oldName, newItem)}
                    disableAdd={isUniqueWishlistFull}
                />
                
                <WishlistSection 
                    title={t('whiteWishlist')}
                    wishlist={goal.wishlist}
                    skillList={availableNormalSkills}
                    onAdd={(item) => handleWishlistAdd('wishlist', item)}
                    onRemove={(name) => handleWishlistRemove('wishlist', name)}
                    onUpdate={(oldName, newItem) => handleWishlistUpdate('wishlist', oldName, newItem)}
                />

            </div>
        </section>
    );
};

export default GoalDefinition;