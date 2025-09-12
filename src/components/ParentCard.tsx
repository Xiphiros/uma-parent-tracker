import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Grandparent, ManualParentData, Parent, UniqueSpark, BlueSpark, PinkSpark } from '../types';
import SparkTag from './common/SparkTag';
import './ParentCard.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChevronDown, faUser, faStar, faRunning, faPalette } from '@fortawesome/free-solid-svg-icons';

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
}

const GrandparentDisplay = ({ grandparent }: { grandparent: Grandparent }) => {
    const { t } = useTranslation(['roster', 'common', 'game']);
    const { appData, dataDisplayLanguage, umaMapById, skillMapByName } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const getSparkDisplayName = (spark: UniqueSpark) => {
        const skill = skillMapByName.get(spark.name);
        return skill ? skill[displayNameProp] : spark.name;
    };
    
    let gpData: (ManualParentData & { name?: string }) | null = null;
    if (typeof grandparent === 'number') {
        const ownedParent = appData.inventory.find(p => p.id === grandparent);
        if (ownedParent) {
            const uma = umaMapById.get(ownedParent.umaId);
            gpData = { ...ownedParent, name: uma ? uma[displayNameProp] : ownedParent.name };
        }
    } else {
        const manualUma = grandparent.umaId ? umaMapById.get(grandparent.umaId) : null;
        gpData = { ...grandparent, name: manualUma ? manualUma[displayNameProp] : t('parentCard.borrowedParent') };
    }

    if (!gpData) return <p className="parent-card__no-sparks-text">{t('parentCard.noGpData')}</p>;

    return (
        <div className="parent-card__lineage-gp">
            <h5 className="parent-card__lineage-gp-name">{gpData.name}</h5>
            <div className="parent-card__spark-container">
                <SparkTag category="blue" type={t(gpData.blueSpark.type, { ns: 'game' })} stars={gpData.blueSpark.stars} originalType={gpData.blueSpark.type} />
                <SparkTag category="pink" type={t(gpData.pinkSpark.type, { ns: 'game' })} stars={gpData.pinkSpark.stars} originalType={gpData.pinkSpark.type} />
                {gpData.uniqueSparks.map(s => <SparkTag key={s.name} category="unique" type={getSparkDisplayName(s)} stars={s.stars} />)}
            </div>
        </div>
    );
};

const ParentCard = ({ parent, isTopParent = false, displayScore = true, onEdit, onDelete, onAssign, onMove, assignedProjects, isSelectionMode = false, onSelect }: ParentCardProps) => {
    const { t } = useTranslation(['roster', 'common', 'game']);
    const { getActiveProfile, dataDisplayLanguage, umaMapById, skillMapByName, appData } = useAppContext();
    const [isLineageVisible, setIsLineageVisible] = useState(false);
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

        return { blue, pink, unique };
    }, [parent, appData.inventory]);

    const getSparkDisplayName = (name: string) => {
        const skill = skillMapByName.get(name);
        return skill ? skill[displayNameProp] : name;
    };

    const allWhiteSparks = useMemo(() => {
        if (!goal) return parent.whiteSparks.map(spark => ({ ...spark, tier: 'Other' }));
        return parent.whiteSparks.map(spark => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? `${t('parentCard.rank')} ${wishlistItem.tier}` : 'Other';
            return { ...spark, tier };
        });
    }, [parent.whiteSparks, goal, t]);
    
    const hasGrandparents = parent.grandparent1 || parent.grandparent2;
    const hasLineageSparks = Object.keys(aggregatedSparks.blue).length > 1 || Object.keys(aggregatedSparks.pink).length > 1 || aggregatedSparks.unique.length > parent.uniqueSparks.length;

    return (
        <div className={`parent-card ${isTopParent ? 'parent-card--top-pair' : ''}`}>
            <div className="parent-card__main-content">
                <div className="parent-card__image-container">
                    <img
                        src={umaData?.image ? `${import.meta.env.BASE_URL}${umaData.image}` : 'https://via.placeholder.com/80'}
                        alt={parent.name}
                        className="parent-card__image"
                    />
                </div>
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
                                <button onClick={() => onSelect(parent)} className="button button--primary button--small mt-1">{t('common:select')}</button>
                            ) : (
                                <div className="parent-card__actions">
                                    {onMove && <button onClick={onMove} className="parent-card__edit-btn">{t('common:move')}</button>}
                                    {onEdit && <button onClick={onEdit} className="parent-card__edit-btn">{t('common:edit')}</button>}
                                    {onDelete && <button onClick={onDelete} className="parent-card__delete-btn">{t('common:delete')}</button>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="parent-card__body">
                        <div className="parent-card__spark-grid">
                            {/* Blue Sparks */}
                            <div className="parent-card__spark-section-icon parent-card__spark-section-icon--blue text-white"><FontAwesomeIcon icon={faRunning} /></div>
                            <div className="parent-card__spark-container">
                                {Object.entries(aggregatedSparks.blue).map(([type, data]) => (
                                    <div key={type} className="lineage-spark" data-spark-type={type.toLowerCase()}>
                                        {data.total}★ {t(type, { ns: 'game' })}
                                        {data.total > data.parent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                        <span className="lineage-spark__parent-contrib">({data.parent}★)</span>
                                    </div>
                                ))}
                            </div>

                            {/* Pink Sparks */}
                            <div className="parent-card__spark-section-icon parent-card__spark-section-icon--pink text-white"><FontAwesomeIcon icon={faPalette} /></div>
                            <div className="parent-card__spark-container">
                                {Object.entries(aggregatedSparks.pink).map(([type, data]) => (
                                    <div key={type} className="lineage-spark" data-spark-type={type.toLowerCase().replace(/ /g, '-')}>
                                        {data.total}★ {t(type, { ns: 'game' })}
                                        {data.total > data.parent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                        <span className="lineage-spark__parent-contrib">({data.parent}★)</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Unique Sparks */}
                            {aggregatedSparks.unique.length > 0 && (
                                <>
                                    <div className="parent-card__spark-section-icon parent-card__spark-section-icon--unique text-white"><FontAwesomeIcon icon={faStar} /></div>
                                    <div className="parent-card__spark-container">
                                        {aggregatedSparks.unique.map(spark => (
                                            <div key={spark.name} className="lineage-spark" data-spark-category="unique">
                                                {getSparkDisplayName(spark.name)}
                                                {!spark.fromParent && <FontAwesomeIcon icon={faUser} className="lineage-spark__gp-icon" />}
                                                <span className="lineage-spark__parent-contrib">({spark.stars}★)</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="parent-card__spark-container parent-card__spark-container--white">
                            {allWhiteSparks.length > 0 ? (
                                allWhiteSparks.map(spark => (
                                    <SparkTag key={spark.name} category="white" type={getSparkDisplayName(spark.name)} stars={spark.stars}>
                                        <span className="parent-card__spark-tier">({spark.tier})</span>
                                    </SparkTag>
                                ))
                            ) : (
                                <p className="parent-card__no-sparks-text">{t('parentCard.noWhiteSparks')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {(hasLineageSparks || onAssign) && !isSelectionMode && (
                <div className="parent-card__footer">
                    {hasLineageSparks && (
                         <button className="parent-card__lineage-toggle" onClick={() => setIsLineageVisible(!isLineageVisible)}>
                            <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${isLineageVisible ? 'rotate-180' : ''}`} />
                            <span className="ml-1">{t('parentCard.lineage')}</span>
                        </button>
                    )}
                    {onAssign && (
                        <>
                            <span className="parent-card__assigned-projects" title={assignedProjects?.join(', ')}>
                                {assignedProjects && assignedProjects.length > 0 ? assignedProjects.join(', ') : t('inventory.unassigned')}
                            </span>
                            <button className="button button--secondary button--small" onClick={onAssign}>
                                <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </>
                    )}
                </div>
            )}
            {isLineageVisible && hasGrandparents && (
                <div className="parent-card__lineage">
                    <h4 className="parent-card__lineage-title">{t('parentCard.legacyOrigin')}</h4>
                    {parent.grandparent1 && <GrandparentDisplay grandparent={parent.grandparent1} />}
                    {parent.grandparent2 && <GrandparentDisplay grandparent={parent.grandparent2} />}
                </div>
            )}
        </div>
    );
};

export default ParentCard;