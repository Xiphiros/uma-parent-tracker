import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, WishlistItem } from '../types';
import SparkTag from './common/SparkTag';
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
    const { umaMapById, dataDisplayLanguage, getActiveProfile } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    const goal = getActiveProfile()?.goal;

    const umaData = useMemo(() => umaMapById.get(parent.umaId), [umaMapById, parent.umaId]);
    const displayName = umaData ? umaData[displayNameProp] : parent.name;

    const displayedSparks = useMemo(() => {
        const sparks = [];
        // 1. Add representative Blue, Pink, and Unique sparks
        sparks.push({ ...parent.blueSpark, category: 'blue' as const, name: parent.blueSpark.type });
        sparks.push({ ...parent.pinkSpark, category: 'pink' as const, name: parent.pinkSpark.type });
        parent.uniqueSparks.forEach(s => sparks.push({ ...s, category: 'unique' as const }));

        // 2. Filter, sort, and limit white sparks based on the user's wishlist
        if (goal?.wishlist) {
            const wishlistMap = new Map(goal.wishlist.map((item: WishlistItem) => [item.name, WISH_RANK_ORDER[item.tier]]));
            
            const topWhiteSparks = parent.whiteSparks
                .filter(spark => wishlistMap.has(spark.name))
                .sort((a, b) => (wishlistMap.get(a.name) ?? 99) - (wishlistMap.get(b.name) ?? 99))
                .slice(0, 3); // Show only the top 3 wishlisted sparks
            
            topWhiteSparks.forEach(s => sparks.push({ ...s, category: 'white' as const }));
        }
        
        return sparks;
    }, [goal, parent]);
    
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
                            category={spark.category} 
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