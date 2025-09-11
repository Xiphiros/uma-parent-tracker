import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, UniqueSpark, WhiteSpark } from '../types';
import SparkTag from './common/SparkTag';
import './ParentCard.css';
import { useTranslation } from 'react-i18next';

interface ParentCardProps {
    parent: Parent;
    isTopParent?: boolean;
    displayScore?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

const ParentCard = ({ parent, isTopParent = false, displayScore = true, onEdit, onDelete }: ParentCardProps) => {
    const { t } = useTranslation(['roster', 'common', 'game']);
    const { getActiveProfile, dataDisplayLanguage, umaMapById, skillMapByName } = useAppContext();
    const goal = getActiveProfile()?.goal;
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const umaData = useMemo(() => umaMapById.get(parent.umaId), [umaMapById, parent.umaId]);
    const displayName = umaData ? umaData[displayNameProp] : parent.name;

    const getSparkDisplayName = (spark: WhiteSpark | UniqueSpark) => {
        const skill = skillMapByName.get(spark.name);
        return skill ? skill[displayNameProp] : spark.name;
    };

    const allWhiteSparks = useMemo(() => {
        if (!goal) return parent.whiteSparks.map(spark => ({ ...spark, tier: 'Other' }));

        return parent.whiteSparks.map(spark => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? `${t('parentCard.rank')} ${wishlistItem.tier}` : 'Other';
            return { ...spark, tier };
        });
    }, [parent.whiteSparks, goal, t]);

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
                            {!isTopParent && (
                                <div className="parent-card__actions">
                                    <button onClick={onEdit} className="parent-card__edit-btn">{t('common:edit')}</button>
                                    <button onClick={onDelete} className="parent-card__delete-btn">{t('common:delete')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="parent-card__body">
                        <div className="parent-card__spark-container">
                            <SparkTag category="blue" type={t(parent.blueSpark.type, { ns: 'game' })} stars={parent.blueSpark.stars} originalType={parent.blueSpark.type} />
                            <SparkTag category="pink" type={t(parent.pinkSpark.type, { ns: 'game' })} stars={parent.pinkSpark.stars} originalType={parent.pinkSpark.type} />
                        </div>

                        {parent.uniqueSparks.length > 0 && (
                            <div className="parent-card__spark-container mt-2">
                                {parent.uniqueSparks.map(spark => {
                                    const wishlistItem = goal?.uniqueWishlist.find(w => w.name === spark.name);
                                    const tier = wishlistItem ? `${t('parentCard.rank')} ${wishlistItem.tier}` : 'Other';
                                    return (
                                        <SparkTag key={spark.name} category="unique" type={getSparkDisplayName(spark)} stars={spark.stars}>
                                            <span className="parent-card__spark-tier">({tier})</span>
                                        </SparkTag>
                                    )
                                })}
                            </div>
                        )}
                        
                        <div className="parent-card__spark-container mt-2 parent-card__spark-container--white">
                            {allWhiteSparks.length > 0 ? (
                                allWhiteSparks.map(spark => (
                                    <SparkTag key={spark.name} category="white" type={getSparkDisplayName(spark)} stars={spark.stars}>
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
        </div>
    );
};

export default ParentCard;