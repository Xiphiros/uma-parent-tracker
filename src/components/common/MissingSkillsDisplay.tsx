import { useMemo, useState } from 'react';
import { WishlistItem } from '../../types';
import { useTranslation } from 'react-i18next';
import './MissingSkillsDisplay.css';
import CheckableSkillItem from './CheckableSkillItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface MissingSkillsDisplayProps {
    missingSkills: WishlistItem[];
    unsaturatedSkills: WishlistItem[];
    totalWishlistCount: number;
    checkedSkills?: Set<string>;
    onToggleSkill?: (skillName: string) => void;
    onClearChecks?: () => void;
}

type SkillView = 'missing' | 'partial';

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

const MissingSkillsDisplay = ({ missingSkills, unsaturatedSkills, totalWishlistCount, checkedSkills, onToggleSkill, onClearChecks }: MissingSkillsDisplayProps) => {
    const { t } = useTranslation(['roster', 'goal', 'common']);
    const [view, setView] = useState<SkillView>('missing');
    const [searchQuery, setSearchQuery] = useState('');

    const skillsToDisplay = useMemo(() => {
        const sourceList = view === 'missing' ? missingSkills : unsaturatedSkills;
        if (!searchQuery) return sourceList;

        const lowerQuery = searchQuery.toLowerCase();
        return sourceList.filter(item => item.name.toLowerCase().includes(lowerQuery));

    }, [view, missingSkills, unsaturatedSkills, searchQuery]);


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
            <div className="missing-skills__controls">
                <input 
                    type="text" 
                    placeholder={t('common:searchPlaceholder')}
                    className="form__input form__input--small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {onClearChecks && checkedSkills && checkedSkills.size > 0 && (
                    <button className="button button--secondary button--small" onClick={onClearChecks}>
                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                        {t('roster:breedingPlanner.clearChecks')}
                    </button>
                )}
            </div>

            <div className="missing-skills__toggle">
                <button 
                    className={`missing-skills__toggle-btn ${view === 'missing' ? 'missing-skills__toggle-btn--active' : ''}`}
                    onClick={() => setView('missing')}>
                    {t('roster:breedingPlanner.viewMissing')} ({missingSkills.length})
                </button>
                <button 
                    className={`missing-skills__toggle-btn ${view === 'partial' ? 'missing-skills__toggle-btn--active' : ''}`}
                    onClick={() => setView('partial')}>
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
             {skillsToDisplay.length === 0 && view === 'partial' && (
                <p className="missing-skills__placeholder">{t('roster:breedingPlanner.allSkillsSaturated')}</p>
            )}
             {skillsToDisplay.length === 0 && searchQuery && (
                <p className="missing-skills__placeholder">{t('common:noResults')}</p>
            )}
        </div>
    );
};

export default MissingSkillsDisplay;