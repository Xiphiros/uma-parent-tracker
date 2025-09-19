import { useMemo, useState } from 'react';
import { WishlistItem } from '../../types';
import { useTranslation } from 'react-i18next';
import './MissingSkillsDisplay.css';
import CheckableSkillItem from './CheckableSkillItem';

interface MissingSkillsDisplayProps {
    missingSkills: WishlistItem[];
    unsaturatedSkills: WishlistItem[];
    totalWishlistCount: number;
    checkedSkills?: Set<string>;
    onToggleSkill?: (skillName: string) => void;
}

type SkillView = 'missing' | 'unsaturated';

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

const MissingSkillsDisplay = ({ missingSkills, unsaturatedSkills, totalWishlistCount, checkedSkills, onToggleSkill }: MissingSkillsDisplayProps) => {
    const { t } = useTranslation(['roster', 'goal']);
    const [view, setView] = useState<SkillView>('missing');

    const skillsToDisplay = view === 'missing' ? missingSkills : unsaturatedSkills;

    const groupedSkills = useMemo(() => {
        if (!skillsToDisplay) return {};
        return skillsToDisplay.reduce((acc, item) => {
            (acc[item.tier] = acc[item.tier] || []).push(item);
            return acc;
        }, {} as Record<string, WishlistItem[]>);
    }, [skillsToDisplay]);

    if (totalWishlistCount === 0) {
        return <p className="missing-skills__placeholder">{t('goal:wishlist.noItems')}</p>;
    }
    
    if (missingSkills.length === 0) {
        return <p className="missing-skills__success">{t('roster:breedingPlanner.allSkillsCovered', { count: totalWishlistCount })}</p>;
    }
    
    const canBeChecked = checkedSkills && onToggleSkill;

    return (
        <div className="missing-skills">
            <div className="missing-skills__toggle">
                <button 
                    className={`missing-skills__toggle-btn ${view === 'missing' ? 'missing-skills__toggle-btn--active' : ''}`}
                    onClick={() => setView('missing')}>
                    {t('roster:breedingPlanner.viewMissing')} ({missingSkills.length})
                </button>
                <button 
                    className={`missing-skills__toggle-btn ${view === 'unsaturated' ? 'missing-skills__toggle-btn--active' : ''}`}
                    onClick={() => setView('unsaturated')}>
                    {t('roster:breedingPlanner.viewUnsaturated')} ({unsaturatedSkills.length})
                </button>
            </div>
            
            {Object.keys(groupedSkills).sort((a, b) => WISH_RANK_ORDER[a] - WISH_RANK_ORDER[b]).map(tier => (
                <div key={tier} className="missing-skills__group">
                    <h4 className="missing-skills__tier-title">{t('goal:wishlist.rank')} {tier}</h4>
                    <ul className="missing-skills__list">
                        {groupedSkills[tier].map(item => (
                             <li key={item.name}>
                                {canBeChecked ? (
                                    <CheckableSkillItem 
                                        skillName={item.name} 
                                        isChecked={checkedSkills.has(item.name)} 
                                        onToggle={onToggleSkill} 
                                    />
                                ) : (
                                    <span className="missing-skills__item">
                                        {item.name}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
             {skillsToDisplay.length === 0 && view === 'unsaturated' && (
                <p className="missing-skills__placeholder">{t('roster:breedingPlanner.allSkillsSaturated')}</p>
            )}
        </div>
    );
};

export default MissingSkillsDisplay;