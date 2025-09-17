import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Grandparent, ManualParentData, Parent, BlueSpark, PinkSpark, WhiteSpark } from '../types';
import './ParentCard.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser, faStar, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import LineageTree from './common/LineageTree';

interface ParentCardProps {
    parent: Parent;
    isTopParent?: boolean;
    displayScore?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onAssign?: (event: React.MouseEvent) => void;
    onMove?: () => void;
    assignedProjects?: string[];
    isSelectionMode?: boolean;
    onSelect?: (parent: Parent) => void;
    isDisabled?: boolean;
    isInCurrentRoster?: boolean;
}

const WISH_RANK_ORDER: { [key: string]: number } = { S: 0, A: 1, B: 2, C: 3 };

const ParentCard = ({ parent, isTopParent = false, displayScore = true, onEdit, onDelete, onAssign, onMove, assignedProjects, isSelectionMode = false, onSelect, isDisabled = false, isInCurrentRoster = false }: ParentCardProps) => {
    const { t } = useTranslation(['roster', 'common', 'game']);
    const { getActiveProfile, dataDisplayLanguage, umaMapById, skillMapByName, appData } = useAppContext();
    const goal = getActiveProfile()?.goal;
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const umaData = useMemo(() => umaMapById.get(parent.umaId), [umaMapById, parent.umaId]);
    const displayName = umaData ? umaData[displayNameProp] : parent.name;

    const aggregatedSparks = useMemo(() => {
        const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));

        const resolveGrandparent = (gp: Grandparent) => {
            if (typeof gp === 'number') return inventoryMap.get(gp);
            return gp;
        };
        const gp1 = parent.grandparent1 ? resolveGrandparent(parent.grandparent1) : null;
        const gp2 = parent.grandparent2 ? resolveGrandparent(parent.grandparent2) : null;

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

        const unique: { name: string, stars: number, fromParent: boolean }[] = parent.uniqueSparks.map(s => ({ ...s, fromParent: true }));
        const parentUniqueNames = new Set(parent.uniqueSparks.map(s => s.name));
        
        const addGrandparentUniques = (gp: Parent | ManualParentData | null | undefined) => {
            if (!gp) return;
            gp.uniqueSparks.forEach(spark => {
                if (!parentUniqueNames.has(spark.name)) {
                    unique.push({ ...spark, fromParent: false });
                }
            });
        };
        addGrandparentUniques(gp1);
        addGrandparentUniques(gp2);

        // Aggregate White Sparks
        const white: Map<string, { totalStars: number; contributions: { source: string; stars: number }[]; name: string; tier: string | null }> = new Map();
        let totalWhiteSparksCount = 0;

        const processWhiteSpark = (spark: WhiteSpark, source: string) => {
            totalWhiteSparksCount++;
            const existing = white.get(spark.name);
            if (existing) {
                existing.totalStars += spark.stars;
                existing.contributions.push({ source, stars: spark.stars });
            } else {
                const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                white.set(spark.name, {
                    name: spark.name,
                    totalStars: spark.stars,
                    contributions: [{ source, stars: spark.stars }],
                    tier: wishlistItem ? wishlistItem.tier : null
                });
            }
        };

        parent.whiteSparks.forEach(s => processWhiteSpark(s, t('parentCard.parentSource')));
        if (gp1 && 'whiteSparks' in gp1) gp1.whiteSparks.forEach(s => processWhiteSpark(s, t('parentCard.gpSource')));
        if (gp2 && 'whiteSparks' in gp2) gp2.whiteSparks.forEach(s => processWhiteSpark(s, t('parentCard.gpSource')));

        const sortedWhite = Array.from(white.values()).sort((a, b) => {
            const aTier = a.tier ? WISH_RANK_ORDER[a.tier] : 99;
            const bTier = b.tier ? WISH_RANK_ORDER[b.tier] : 99;
            if (aTier !== bTier) return aTier - bTier;
            if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
            return a.name.localeCompare(b.name);
        });

        return { blue, pink, unique, white: sortedWhite, totalWhiteSparksCount };
    }, [parent, appData.inventory, goal, t]);

    const getSparkDisplayName = (name: string) => {
        const skill = skillMapByName.get(name);
        return skill ? skill[displayNameProp] : name;
    };

    const renderSparksBody = () => (
        <div className="parent-card__body">
            <div className="parent-card__spark-container">
                {Object.entries(aggregatedSparks.blue).map(([type, data]) => (
                    <div key={type} className="lineage-spark" data-spark-category="blue" data-spark-type={type.toLowerCase()}>
                        {data.total}★ {t(type, { ns: 'game' })}
                        {data.parent > 0 && (
                            <>
                                <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />
                                <span className="lineage-spark__parent-contrib">({data.parent}★)</span>
                            </>
                        )}
                    </div>
                ))}
                {Object.entries(aggregatedSparks.pink).map(([type, data]) => (
                    <div key={type} className="lineage-spark" data-spark-category="pink" data-spark-type={type.toLowerCase().replace(/ /g, '-')}>
                        {data.total}★ {t(type, { ns: 'game' })}
                        {data.parent > 0 && (
                            <>
                                <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />
                                <span className="lineage-spark__parent-contrib">({data.parent}★)</span>
                            </>
                        )}
                    </div>
                ))}
                {aggregatedSparks.unique.map(spark => (
                    <div key={spark.name} className="lineage-spark" data-spark-category="unique">
                        {getSparkDisplayName(spark.name)}
                        {spark.fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                        <span className="lineage-spark__parent-contrib">({spark.stars}★)</span>
                    </div>
                ))}
                {aggregatedSparks.white.length > 0 ? (
                    aggregatedSparks.white.map(spark => {
                        const fromParent = spark.contributions.some(c => c.source === t('parentCard.parentSource'));
                        const tier = spark.tier ? `${t('parentCard.rank')} ${spark.tier}` : null;
                        const tooltipText = spark.contributions.map(c => `${c.source}: ${c.stars}★`).join(' + ');
                        
                        return (
                            <div key={spark.name} className="lineage-spark" data-spark-category="white" title={tooltipText}>
                                {spark.totalStars}★ {getSparkDisplayName(spark.name)}
                                {fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                {tier && <span className="parent-card__spark-tier">({tier})</span>}
                            </div>
                        );
                    })
                ) : (
                    <p className="parent-card__no-sparks-text">{t('parentCard.noWhiteSparks')}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className={`parent-card ${isTopParent ? 'parent-card--top-pair' : ''} ${isDisabled ? 'parent-card--disabled' : ''} ${isInCurrentRoster ? 'parent-card--in-roster' : ''}`}>
            <div className="parent-card__main-content">
                <LineageTree parent={parent} />
                <div className="parent-card__details">
                    <div className="parent-card__header">
                        <div>
                            <h3 className="parent-card__name">{displayName}</h3>
                            <div className="parent-card__meta">
                                <span className="parent-card__gen">({t('parentCard.gen')} {parent.gen})</span>
                                <span className="parent-card__spark-count" title={t('parentCard.whiteSparkCount')}>
                                    <FontAwesomeIcon icon={faStar} /> {parent.whiteSparks.length}
                                </span>
                                <span className="parent-card__total-spark-count" title={t('parentCard.totalWhiteSparkCount')}>
                                    <FontAwesomeIcon icon={faLayerGroup} /> {aggregatedSparks.totalWhiteSparksCount}
                                </span>
                            </div>
                        </div>
                        <div className="parent-card__score-wrapper">
                            {displayScore && <div className="parent-card__score">{parent.score} {t('parentCard.pts')}</div>}
                            {isSelectionMode && onSelect ? (
                                <button onClick={() => !isDisabled && onSelect(parent)} className="button button--primary button--small mt-1" disabled={isDisabled}>{t('common:select')}</button>
                            ) : (
                                <div className="parent-card__actions">
                                    {onMove && <button onClick={onMove} className="parent-card__edit-btn">{t('common:move')}</button>}
                                    {onEdit && <button onClick={onEdit} className="parent-card__edit-btn">{t('common:edit')}</button>}
                                    {onDelete && <button onClick={onDelete} className="parent-card__delete-btn">{t('common:delete')}</button>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {renderSparksBody()}

            {onAssign && !isSelectionMode && (
                <div className="parent-card__footer">
                    <span className="parent-card__assigned-projects" title={assignedProjects?.join(', ')}>
                        {assignedProjects && assignedProjects.length > 0 ? assignedProjects.join(', ') : t('inventory.unassigned')}
                    </span>
                    <button className="button button--secondary button--small" onClick={onAssign}>
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ParentCard;