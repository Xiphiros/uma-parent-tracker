import { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Grandparent, ManualParentData, Parent, WhiteSpark, BlueSpark, PinkSpark } from '../../types';
import { useTranslation } from 'react-i18next';
import './PairedParentCard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons';

interface PairedParentCardProps {
    parent: Parent;
    onDetailsClick: () => void;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

const PairedParentCard = ({ parent, onDetailsClick }: PairedParentCardProps) => {
    const { t } = useTranslation(['roster', 'game']);
    const { umaMapById, dataDisplayLanguage, getActiveProfile, appData, skillMapByName } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const umaData = useMemo(() => umaMapById.get(parent.umaId), [umaMapById, parent.umaId]);
    const displayName = umaData ? umaData[displayNameProp] : parent.name;

    const aggregatedSparks = useMemo(() => {
        const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));

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

        const unique: { name: string, stars: number, fromParent: boolean }[] = [];
        const parentUniqueNames = new Set<string>();
        parent.uniqueSparks.forEach(s => {
            unique.push({ ...s, fromParent: true });
            parentUniqueNames.add(s.name);
        });
        
        const addGrandparentUniques = (gp: Parent | ManualParentData | null | undefined) => {
            if (!gp) return;
            gp.uniqueSparks.forEach(spark => {
                if (!parentUniqueNames.has(spark.name)) {
                    unique.push({ ...spark, fromParent: false });
                    parentUniqueNames.add(spark.name); // Add to set to prevent duplicates between GPs
                }
            });
        };
        addGrandparentUniques(gp1);
        addGrandparentUniques(gp2);

        const white: Map<string, { totalStars: number; parentStars: number; contributions: { source: string; stars: number }[]; name: string; tier: string | null }> = new Map();
        
        const processWhiteSpark = (spark: WhiteSpark, source: string) => {
            const existing = white.get(spark.name);
            if (existing) {
                existing.totalStars += spark.stars;
                existing.contributions.push({ source, stars: spark.stars });
            } else {
                const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                white.set(spark.name, {
                    name: spark.name,
                    totalStars: spark.stars,
                    parentStars: 0, // Will be calculated next
                    contributions: [{ source, stars: spark.stars }],
                    tier: wishlistItem ? wishlistItem.tier : null
                });
            }
        };

        parent.whiteSparks.forEach(s => processWhiteSpark(s, t('parentCard.parentSource')));
        if (gp1 && 'whiteSparks' in gp1) gp1.whiteSparks.forEach(s => processWhiteSpark(s, t('parentCard.gpSource')));
        if (gp2 && 'whiteSparks' in gp2) gp2.whiteSparks.forEach(s => processWhiteSpark(s, t('parentCard.gpSource')));

        // Calculate parent contribution for each white spark
        white.forEach(spark => {
            spark.parentStars = spark.contributions
                .filter(c => c.source === t('parentCard.parentSource'))
                .reduce((sum, c) => sum + c.stars, 0);
        });

        const sortedWhite = Array.from(white.values()).sort((a, b) => {
            const aTier = a.tier ? WISH_RANK_ORDER[a.tier] : 99;
            const bTier = b.tier ? WISH_RANK_ORDER[b.tier] : 99;
            if (aTier !== bTier) return aTier - bTier;
            if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
            return a.name.localeCompare(b.name);
        });

        return { blue, pink, unique, white: sortedWhite };
    }, [parent, appData.inventory, goal, t]);

    const getSparkDisplayName = (name: string) => {
        const skill = skillMapByName.get(name);
        return skill ? skill[displayNameProp] : name;
    };
    
    return (
        <div className="paired-parent-card">
            <div className="paired-parent-card__header">
                <img src={`${import.meta.env.BASE_URL}${umaData?.image}`} alt={displayName} className="paired-parent-card__avatar" />
                <div className="paired-parent-card__details">
                    <div className="paired-parent-card__name-container">
                        <h4 className="paired-parent-card__name">
                            <span>{displayName}</span>
                            {parent.isBorrowed && <span className="parent-card__borrowed-tag">{t('parentCard.borrowed')}</span>}
                        </h4>
                    </div>
                    <div className="paired-parent-card__score">{parent.score} {t('parentCard.pts')}</div>
                </div>
                 <button className="paired-parent-card__details-btn" onClick={onDetailsClick} title={t('parentCard.details')}>
                    <FontAwesomeIcon icon={faEllipsis} />
                </button>
            </div>
            <div className="paired-parent-card__body">
                <div className="paired-parent-card__sparks">
                    {Object.entries(aggregatedSparks.blue).map(([type, data]) => (
                        <div key={type} className="lineage-spark" data-spark-category="blue" data-spark-type={type.toLowerCase()}>
                            {`${data.total}★ ${t(type, { ns: 'game' })}${data.parent > 0 && data.parent < data.total ? ` (${data.parent}★)` : ''}`}
                        </div>
                    ))}
                    {Object.entries(aggregatedSparks.pink).map(([type, data]) => (
                        <div key={type} className="lineage-spark" data-spark-category="pink" data-spark-type={type.toLowerCase().replace(/ /g, '-')}>
                            {`${data.total}★ ${t(type, { ns: 'game' })}${data.parent > 0 && data.parent < data.total ? ` (${data.parent}★)` : ''}`}
                        </div>
                    ))}
                    {aggregatedSparks.unique.map(spark => (
                        <div key={spark.name} className="lineage-spark" data-spark-category="unique">
                            {`${getSparkDisplayName(spark.name)} (${spark.stars}★)`}
                        </div>
                    ))}
                    {aggregatedSparks.white.map(spark => {
                        const tier = spark.tier ? `(${t('parentCard.rank')} ${spark.tier})` : null;
                        const tooltipText = spark.contributions.map(c => `${c.source}: ${c.stars}★`).join(' + ');
                        
                        return (
                            <div key={spark.name} className="lineage-spark" data-spark-category="white" title={tooltipText}>
                                {`${spark.totalStars}★ ${getSparkDisplayName(spark.name)}${spark.parentStars > 0 && spark.parentStars < spark.totalStars ? ` (${spark.parentStars}★)` : ''}`}
                                {tier && <span className="parent-card__spark-tier">{tier}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PairedParentCard;