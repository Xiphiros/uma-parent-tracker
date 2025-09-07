import { useAppContext } from '../context/AppContext';
import { Parent } from '../types';
import SparkTag from './common/SparkTag';

interface ParentCardProps {
    parent: Parent;
    isTopParent?: boolean;
}

const ParentCard = ({ parent, isTopParent = false }: ParentCardProps) => {
    const { getActiveProfile } = useAppContext();
    const goal = getActiveProfile()?.goal;

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
                            <button data-id={parent.id} className="parent-card__edit-btn">Edit</button>
                            <button data-id={parent.id} className="parent-card__delete-btn">Delete</button>
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
                    {parent.whiteSparks.length > 0 ? (
                        parent.whiteSparks.map(spark => {
                            const wishlistItem = goal?.wishlist.find(w => w.name === spark.name);
                            if (!wishlistItem) return null; // Only show wishlist sparks
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