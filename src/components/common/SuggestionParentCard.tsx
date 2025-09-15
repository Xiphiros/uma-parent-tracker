import { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Grandparent, ManualParentData, Parent, BlueSpark, PinkSpark } from '../../types';
import './SuggestionParentCard.css';
import SparkTag from './SparkTag';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

interface SuggestionParentCardProps {
    parent: Parent;
}

const SuggestionParentCard = ({ parent }: SuggestionParentCardProps) => {
    const { appData, umaMapById, dataDisplayLanguage, skillMapByName } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    
    const uma = umaMapById.get(parent.umaId);
    const getSkillDisplayName = (name_en: string) => skillMapByName.get(name_en)?.[displayNameProp] || name_en;
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);
    const resolveGrandparent = (gp: Grandparent | undefined) => {
        if (!gp) return null;
        if (typeof gp === 'number') return inventoryMap.get(gp) || null;
        return gp;
    };

    const aggregatedSparks = useMemo(() => {
        const gp1 = resolveGrandparent(parent.grandparent1);
        const gp2 = resolveGrandparent(parent.grandparent2);
        
        const unique: { name: string, stars: 1 | 2 | 3, fromParent: boolean }[] = parent.uniqueSparks.map(s => ({ ...s, fromParent: true }));
        const parentUniqueNames = new Set(parent.uniqueSparks.map(s => s.name));
        
        const addGrandparentUniques = (gp: Parent | ManualParentData | null) => {
            if (!gp) return;
            gp.uniqueSparks.forEach(spark => {
                if (!parentUniqueNames.has(spark.name)) {
                    unique.push({ ...spark, fromParent: false });
                }
            });
        };
        addGrandparentUniques(gp1);
        addGrandparentUniques(gp2);

        const white: { name: string, stars: 1 | 2 | 3, fromParent: boolean }[] = parent.whiteSparks.map(s => ({ ...s, fromParent: true }));
        const lineageWhiteNames = new Set(parent.whiteSparks.map(s => s.name));

        const addGrandparentWhiteSparks = (gp: Parent | ManualParentData | null) => {
            if (!gp || !('whiteSparks' in gp)) return;
            gp.whiteSparks.forEach(spark => {
                if (!lineageWhiteNames.has(spark.name)) {
                    white.push({ ...spark, fromParent: false });
                    lineageWhiteNames.add(spark.name);
                }
            });
        };
        addGrandparentWhiteSparks(gp1);
        addGrandparentWhiteSparks(gp2);
        
        return { unique, white };
    }, [parent, inventoryMap]);

    const getGrandparentImage = (gp: Grandparent | undefined) => {
        const resolved = resolveGrandparent(gp);
        if (resolved?.umaId) {
            return umaMapById.get(resolved.umaId)?.image || null;
        }
        return null;
    };

    const gp1Image = getGrandparentImage(parent.grandparent1);
    const gp2Image = getGrandparentImage(parent.grandparent2);

    return (
        <div className="suggestion-card">
            <div className="suggestion-card__main-info">
                <img src={`${import.meta.env.BASE_URL}${uma?.image}`} alt={uma?.[displayNameProp]} className="suggestion-card__image" />
                <div className="suggestion-card__details">
                    <p className="suggestion-card__name">{uma?.[displayNameProp]}</p>
                    <p className="suggestion-card__score">{parent.score} pts</p>
                </div>
                <div className="suggestion-card__grandparents">
                    {gp1Image && <img src={`${import.meta.env.BASE_URL}${gp1Image}`} className="suggestion-card__gp-image" />}
                    {gp2Image && <img src={`${import.meta.env.BASE_URL}${gp2Image}`} className="suggestion-card__gp-image" />}
                </div>
            </div>
            <div className="suggestion-card__sparks">
                <SparkTag category="blue" type={parent.blueSpark.type} stars={parent.blueSpark.stars} />
                <SparkTag category="pink" type={parent.pinkSpark.type} stars={parent.pinkSpark.stars} />
                {aggregatedSparks.unique.map(s => (
                    <SparkTag key={s.name} category="unique" type={getSkillDisplayName(s.name)} stars={s.stars}>
                        {s.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                    </SparkTag>
                ))}
                 {aggregatedSparks.white.map(s => (
                    <SparkTag key={s.name} category="white" type={getSkillDisplayName(s.name)} stars={s.stars}>
                        {s.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                    </SparkTag>
                ))}
            </div>
        </div>
    );
};

export default SuggestionParentCard;