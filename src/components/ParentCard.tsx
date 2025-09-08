import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent } from '../types';
import SparkTag from './common/SparkTag';
import './ParentCard.css';

interface ParentCardProps {
    parent: Parent;
    isTopParent?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

const ParentCard = ({ parent, isTopParent = false, onEdit, onDelete }: ParentCardProps) => {
    const { masterUmaList, getActiveProfile } = useAppContext();
    const goal = getActiveProfile()?.goal;

    const umaData = useMemo(() => masterUmaList.find(u => u.name_en === parent.name), [masterUmaList, parent.name]);

    const allWhiteSparks = useMemo(() => {
        if (!goal) return parent.whiteSparks.map(spark => ({ ...spark, tier: 'Other' }));

        return parent.whiteSparks.map(spark => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? `Rank ${wishlistItem.tier}` : 'Other';
            return { ...spark, tier };
        });
    }, [parent.whiteSparks, goal]);

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
                                {parent.name} <span className="parent-card__gen">(Gen {parent.gen})</span>
                            </h3>
                        </div>
                        <div className="parent-card__score-wrapper">
                            <div className="parent-card__score">{parent.score} pts</div>
                            {!isTopParent && (
                                <div className="parent-card__actions">
                                    <button onClick={onEdit} className="parent-card__edit-btn">Edit</button>
                                    <button onClick={onDelete} className="parent-card__delete-btn">Delete</button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="parent-card__body">
                        <div className="parent-card__spark-container">
                            <SparkTag category="blue" type={parent.blueSpark.type} stars={parent.blueSpark.stars} />
                            <SparkTag category="pink" type={parent.pinkSpark.type} stars={parent.pinkSpark.stars} />
                        </div>

                        {parent.uniqueSparks.length > 0 && (
                            <div className="parent-card__spark-container mt-2">
                                {parent.uniqueSparks.map(spark => {
                                    const wishlistItem = goal?.uniqueWishlist.find(w => w.name === spark.name);
                                    const tier = wishlistItem ? `Rank ${wishlistItem.tier}` : 'Other';
                                    return (
                                        <SparkTag key={spark.name} category="unique" type={spark.name} stars={spark.stars}>
                                            <span className="parent-card__spark-tier">({tier})</span>
                                        </SparkTag>
                                    )
                                })}
                            </div>
                        )}
                        
                        <div className="parent-card__spark-container mt-2 parent-card__spark-container--white">
                            {allWhiteSparks.length > 0 ? (
                                allWhiteSparks.map(spark => (
                                    <SparkTag key={spark.name} category="white" type={spark.name} stars={spark.stars}>
                                        <span className="parent-card__spark-tier">({spark.tier})</span>
                                    </SparkTag>
                                ))
                            ) : (
                                <p className="parent-card__no-sparks-text">No white sparks.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentCard;