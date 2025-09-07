import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent } from '../types';
import SparkTag from './common/SparkTag';

interface ParentCardProps {
    parent: Parent;
    isTopParent?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

const ParentCard = ({ parent, isTopParent = false, onEdit, onDelete }: ParentCardProps) => {
    const { getActiveProfile } = useAppContext();
    const goal = getActiveProfile()?.goal;

    const whiteSparksOnWishlist = useMemo(() => {
        if (!goal) return [];
        return parent.whiteSparks.filter(spark => 
            goal.wishlist.some(w => w.name === spark.name)
        );
    }, [parent.whiteSparks, goal]);

    return (
        <div className={`parent-card ${isTopParent ? 'parent-card--top-pair' : ''}`}>
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
                    {whiteSparksOnWishlist.length > 0 ? (
                        whiteSparksOnWishlist.map(spark => {
                            const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                            if (!wishlistItem) return null; // Should not happen due to filter
                            const tier = `Rank ${wishlistItem.tier}`;
                            return (
                                <SparkTag key={spark.name} category="white" type={spark.name} stars={spark.stars}>
                                    <span className="parent-card__spark-tier">({tier})</span>
                                </SparkTag>
                            )
                        })
                    ) : (
                        <p className="parent-card__no-sparks-text">No wishlist white sparks.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentCard;