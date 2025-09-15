import { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ManualParentData, Parent, BlueSpark, PinkSpark } from '../../types';
import './SuggestionParentCard.css';
import SparkTag from './SparkTag';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { resolveGrandparent } from '../../utils/affinity';
import { useTranslation } from 'react-i18next';
import LineageTree from './LineageTree';

interface SuggestionParentCardProps {
    parent: Parent;
}

const SuggestionParentCard = ({ parent }: SuggestionParentCardProps) => {
    const { t } = useTranslation(['roster', 'game']);
    const { appData, umaMapById, dataDisplayLanguage, skillMapByName, getActiveProfile } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;
    
    const uma = umaMapById.get(parent.umaId);
    const getSkillDisplayName = (name_en: string) => skillMapByName.get(name_en)?.[displayNameProp] || name_en;
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const aggregatedSparks = useMemo(() => {
        const gp1 = resolveGrandparent(parent.grandparent1, inventoryMap);
        const gp2 = resolveGrandparent(parent.grandparent2, inventoryMap);

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
        const skillNames = new Set(parent.uniqueSparks.map(s => s.name));
        
        const addGrandparentUniques = (gp: Parent | ManualParentData | null) => {
            if (!gp) return;
            gp.uniqueSparks.forEach(spark => {
                if (!skillNames.has(spark.name)) {
                    unique.push({ ...spark, fromParent: false });
                    skillNames.add(spark.name);
                }
            });
        };
        addGrandparentUniques(gp1);
        addGrandparentUniques(gp2);

        const white: { name: string, stars: 1 | 2 | 3, fromParent: boolean }[] = parent.whiteSparks.map(s => ({ ...s, fromParent: true }));
        parent.whiteSparks.forEach(s => skillNames.add(s.name));

        const addGrandparentWhiteSparks = (gp: Parent | ManualParentData | null) => {
            if (!gp || !('whiteSparks' in gp)) return;
            gp.whiteSparks.forEach(spark => {
                if (!skillNames.has(spark.name)) {
                    white.push({ ...spark, fromParent: false });
                    skillNames.add(spark.name);
                }
            });
        };
        addGrandparentWhiteSparks(gp1);
        addGrandparentWhiteSparks(gp2);

        return { blue, pink, unique, white };
    }, [parent, inventoryMap]);

    return (
        <div className="suggestion-card">
            <div className="suggestion-card__main-info">
                <LineageTree parent={parent} />
                <div className="suggestion-card__details">
                    <p className="suggestion-card__name">{uma?.[displayNameProp]}</p>
                    <p className="suggestion-card__score">{parent.score} {t('parentCard.pts')}</p>
                </div>
            </div>
            <div className="suggestion-card__sparks">
                {/* Blue Sparks */}
                {Object.entries(aggregatedSparks.blue).map(([type, data]) => (
                    <div key={`blue-${type}`} className="lineage-spark" data-spark-category="blue" data-spark-type={type.toLowerCase()}>
                        {data.total}★ {t(type, { ns: 'game' })}
                        {data.parent > 0 && (
                            <>
                                <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />
                                <span className="lineage-spark__parent-contrib">({data.parent}★)</span>
                            </>
                        )}
                    </div>
                ))}
                {/* Pink Sparks */}
                {Object.entries(aggregatedSparks.pink).map(([type, data]) => (
                    <div key={`pink-${type}`} className="lineage-spark" data-spark-category="pink" data-spark-type={type.toLowerCase().replace(/ /g, '-')}>
                        {data.total}★ {t(type, { ns: 'game' })}
                        {data.parent > 0 && (
                            <>
                                <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />
                                <span className="lineage-spark__parent-contrib">({data.parent}★)</span>
                            </>
                        )}
                    </div>
                ))}
                {/* Unique Sparks */}
                {aggregatedSparks.unique.map(spark => (
                    <SparkTag key={spark.name} category="unique" type={getSkillDisplayName(spark.name)} stars={spark.stars}>
                        {spark.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                    </SparkTag>
                ))}
                {/* White Sparks */}
                {aggregatedSparks.white.map(spark => {
                    const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                    const rank = wishlistItem ? `(${wishlistItem.tier})` : null;
                    return (
                        <SparkTag key={spark.name} category="white" type={getSkillDisplayName(spark.name)} stars={spark.stars}>
                            {spark.fromParent && <FontAwesomeIcon icon={faUser} className="spark-origin-icon" />}
                            {rank && <span className="suggestion-card__spark-tier">{rank}</span>}
                        </SparkTag>
                    );
                })}
            </div>
        </div>
    );
};

export default SuggestionParentCard;