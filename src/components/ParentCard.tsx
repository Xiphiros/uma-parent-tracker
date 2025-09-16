import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Grandparent, ManualParentData, Parent, BlueSpark, PinkSpark } from '../types';
import SparkTag from './common/SparkTag';
import './ParentCard.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser } from '@fortawesome/free-solid-svg-icons';
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

        const white: { name: string, stars: 1 | 2 | 3, fromParent: boolean }[] = parent.whiteSparks.map(s => ({ ...s, fromParent: true }));
        const lineageWhiteNames = new Set(parent.whiteSparks.map(s => s.name));

        const addGrandparentWhiteSparks = (gp: Parent | ManualParentData | null | undefined) => {
            if (!gp || !('whiteSparks' in gp)) return; // Manual data doesn't have white sparks
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
    }, [parent, appData.inventory]);

    const getSparkDisplayName = (name: string) => {
        const skill = skillMapByName.get(name);
        return skill ? skill[displayNameProp] : name;
    };

    const renderSparksBody = () => (
        <div className="parent-card__body">
            <div className="parent-card__spark-grid">
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
                </div>
                <div className="parent-card__spark-container">
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
                </div>
                {aggregatedSparks.unique.length > 0 && (
                    <div className="parent-card__spark-container">
                        {aggregatedSparks.unique.map(spark => (
                            <div key={spark.name} className="lineage-spark" data-spark-category="unique">
                                {getSparkDisplayName(spark.name)}
                                {spark.fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                <span className="lineage-spark__parent-contrib">({spark.stars}★)</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="parent-card__spark-container parent-card__spark-container--white">
                {aggregatedSparks.white.length > 0 ? (
                    aggregatedSparks.white.map(spark => {
                        const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                        const tier = wishlistItem ? `${t('parentCard.rank')} ${wishlistItem.tier}` : 'Other';
                        return (
                            <SparkTag key={spark.name} category="white" type={getSparkDisplayName(spark.name)} stars={spark.stars}>
                                {spark.fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                <span className="parent-card__spark-tier">({tier})</span>
                            </SparkTag>
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
                            <h3 className="parent-card__name">
                                {displayName} <span className="parent-card__gen">({t('parentCard.gen')} {parent.gen})</span>
                            </h3>
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
                    {!isTopParent && renderSparksBody()}
                </div>
            </div>

            {isTopParent && renderSparksBody()}

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