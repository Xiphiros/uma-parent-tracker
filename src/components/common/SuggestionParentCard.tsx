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
    const { appData, umaMapById, dataDisplayLanguage, skillMapByName, getActiveProfile } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;
    
    const uma = umaMapById.get(parent.umaId);
    const getSkillDisplayName = (name_en: string) => skillMapByName.get(name_en)?.[displayNameProp] || name_en;
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);
    
    const aggregatedSparks = useMemo(() => {
        const resolveGrandparent = (gp: Grandparent | undefined) => {
            if (!gp) return null;
            if (typeof gp === 'number') return inventoryMap.get(gp) || null;
            return gp;
        };
        const gp1 = resolveGrandparent(parent.grandparent1);
        const gp2 = resolveGrandparent(parent.grandparent2);

        const blue: { [key: string]: { total: number, parent: number } } = {};
        const pink: { [key: string]: { total: number, parent: number } } = {};

        const processSpark = (map: typeof blue, spark: BlueSpark | PinkSpark, isParent: boolean) => {
            if (!map[spark.type]) map[spark.type] = { total: 0, parent: 0 };
            map[spark.type].total += spark.stars;
            if (isParent) map[spark.type].parent += spark.stars;
        };

        processSpark(blue, parent.blueSpark, true);
        processSpark(pink, parent.pinkSpark, true);
        if (gp1) {
            processSpark(blue, gp1.blueSpark, false);
            processSpark(pink, gp1.pinkSpark, false);
        }
        if (gp2) {
            processSpark(blue, gp2.blueSpark, false);
            processSpark(pink, gp2.pinkSpark, false);
        }

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

        return { blue, pink, unique, white };
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
                 {Object.entries(aggregatedSparks.blue).map(([type, data]) => (
                    <div key={type} className="lineage-spark" data-spark-category="blue">
                        {data.parent > 0 && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                        {data.total}★ {type}
                    </div>
                ))}
                 {Object.entries(aggregatedSparks.pink).map(([type, data]) => (
                    <div key={type} className="lineage-spark" data-spark-category="pink">
                        {data.parent > 0 && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                        {data.total}★ {type}
                    </div>
                ))}
                {aggregatedSparks.unique.map(s => (
                    <div key={s.name} className="lineage-spark" data-spark-category="unique">
                        {s.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                        {getSkillDisplayName(s.name)} ({s.stars}★)
                    </div>
                ))}
                 {aggregatedSparks.white.map(s => {
                    const wishlistItem = goal?.wishlist.find(w => w.name === s.name);
                    const tier = wishlistItem ? `Rank ${wishlistItem.tier}` : 'Other';
                    return (
                        <SparkTag key={s.name} category="white" type={getSkillDisplayName(s.name)} stars={s.stars}>
                            {s.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                            <span className="suggestion-card__spark-tier">({tier})</span>
                        </SparkTag>
                    );
                 })}
            </div>
        </div>
    );
};

export default SuggestionParentCard;