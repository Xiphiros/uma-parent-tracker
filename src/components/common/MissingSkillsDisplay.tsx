import { useMemo } from 'react';
import { WishlistItem } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import './MissingSkillsDisplay.css';

interface MissingSkillsDisplayProps {
    missingSkills: WishlistItem[];
    totalWishlistCount: number;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

const MissingSkillsDisplay = ({ missingSkills, totalWishlistCount }: MissingSkillsDisplayProps) => {
    const { t } = useTranslation(['roster', 'goal']);
    const { skillMapByName, dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const getDisplayName = (name_en: string) => {
        const skill = skillMapByName.get(name_en);
        return skill ? skill[displayNameProp] : name_en;
    };

    const groupedSkills = useMemo(() => {
        if (!missingSkills) return {};
        return missingSkills.reduce((acc, item) => {
            (acc[item.tier] = acc[item.tier] || []).push(item);
            return acc;
        }, {} as Record<string, WishlistItem[]>);
    }, [missingSkills]);

    if (totalWishlistCount === 0) {
        return <p className="missing-skills__placeholder">{t('goal:wishlist.noItems')}</p>;
    }

    if (missingSkills.length === 0) {
        return <p className="missing-skills__success">{t('roster:breedingPlanner.allSkillsCovered', { count: totalWishlistCount })}</p>;
    }

    return (
        <div className="missing-skills">
            {Object.keys(groupedSkills).sort((a, b) => WISH_RANK_ORDER[a] - WISH_RANK_ORDER[b]).map(tier => (
                <div key={tier} className="missing-skills__group">
                    <h4 className="missing-skills__tier-title">{t('goal:wishlist.rank')} {tier}</h4>
                    <ul className="missing-skills__list">
                        {groupedSkills[tier].map(item => (
                            <li key={item.name} className="missing-skills__item">
                                {getDisplayName(item.name)}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default MissingSkillsDisplay;