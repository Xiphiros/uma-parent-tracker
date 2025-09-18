import { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Grandparent, ManualParentData, Parent, WhiteSpark } from '../../types';
import SparkTag from './SparkTag';
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
    const { umaMapById, dataDisplayLanguage, getActiveProfile, appData } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const umaData = useMemo(() => umaMapById.get(parent.umaId), [umaMapById, parent.umaId]);
    const displayName = umaData ? umaData[displayNameProp] : parent.name;

    const displayedSparks = useMemo(() => {
        const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));
        const resolveGrandparent = (gp: Grandparent | undefined): Parent | ManualParentData | null => {
            if (!gp) return null;
            if (typeof gp === 'number') return inventoryMap.get(gp) || null;
            return gp;
        };
        const gp1 = resolveGrandparent(parent.grandparent1);
        const gp2 = resolveGrandparent(parent.grandparent2);

        const allSparks: (any & { category: string, tierSort: number })[] = [];

        // Add representative sparks
        allSparks.push({ ...parent.blueSpark, category: 'blue', name: parent.blueSpark.type, tierSort: 99 });
        allSparks.push({ ...parent.pinkSpark, category: 'pink', name: parent.pinkSpark.type, tierSort: 99 });
        parent.uniqueSparks.forEach(s => {
            const wishlistItem = goal?.uniqueWishlist.find(w => w.name === s.name);
            const tier = wishlistItem ? wishlistItem.tier : 'C'; // Default to C for sorting
            allSparks.push({ ...s, category: 'unique', tierSort: WISH_RANK_ORDER[tier] });
        });

        // Aggregate and add white sparks from lineage
        const whiteSparksMap: Map<string, { stars: number; tier: 'S' | 'A' | 'B' | 'C' }> = new Map();
        const lineage = [parent, gp1, gp2];
        lineage.forEach(member => {
            if (member && 'whiteSparks' in member) {
                (member.whiteSparks as WhiteSpark[]).forEach(spark => {
                    if (!whiteSparksMap.has(spark.name)) {
                        const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                        if (wishlistItem) {
                            whiteSparksMap.set(spark.name, { stars: spark.stars, tier: wishlistItem.tier });
                        }
                    }
                });
            }
        });

        Array.from(whiteSparksMap.entries()).forEach(([name, data]) => {
            allSparks.push({ name, stars: data.stars, category: 'white', tierSort: WISH_RANK_ORDER[data.tier] });
        });
        
        // Sort all collected sparks by importance
        allSparks.sort((a, b) => {
            if (a.category === 'blue' || a.category === 'pink') return -1;
            if (b.category === 'blue' || b.category === 'pink') return 1;
            if (a.tierSort !== b.tierSort) return a.tierSort - b.tierSort;
            if (b.stars !== a.stars) return b.stars - a.stars;
            return a.name.localeCompare(b.name);
        });

        return allSparks.slice(0, 7); // Take the top 7 most important sparks

    }, [goal, parent, appData.inventory]);
    
    return (
        <div className="paired-parent-card">
            <div className="paired-parent-card__header">
                <img src={`${import.meta.env.BASE_URL}${umaData?.image}`} alt={displayName} className="paired-parent-card__avatar" />
                <div className="paired-parent-card__details">
                    <div className="paired-parent-card__name-container">
                        <h4 className="paired-parent-card__name" title={displayName}>{displayName}</h4>
                        {parent.isBorrowed && <span className="parent-card__borrowed-tag">{t('parentCard.borrowed')}</span>}
                    </div>
                    <div className="paired-parent-card__score">{parent.score} {t('parentCard.pts')}</div>
                </div>
                 <button className="paired-parent-card__details-btn" onClick={onDetailsClick} title={t('parentCard.details')}>
                    <FontAwesomeIcon icon={faEllipsis} />
                </button>
            </div>
            <div className="paired-parent-card__body">
                <div className="paired-parent-card__sparks">
                     {displayedSparks.map(spark => (
                        <SparkTag 
                            key={`${spark.category}-${spark.name}`} 
                            category={spark.category as any} 
                            type={t(spark.name, { ns: 'game', defaultValue: spark.name })} 
                            stars={spark.stars}
                            originalType={spark.name}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PairedParentCard;