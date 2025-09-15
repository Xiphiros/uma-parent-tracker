import { useAppContext } from '../../context/AppContext';
import { Parent } from '../../types';
import './SuggestionParentCard.css';
import SparkTag from './SparkTag';

interface SuggestionParentCardProps {
    parent: Parent;
}

const SuggestionParentCard = ({ parent }: SuggestionParentCardProps) => {
    const { umaMapById, dataDisplayLanguage, skillMapByName } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    
    const uma = umaMapById.get(parent.umaId);
    const getSkillDisplayName = (name_en: string) => skillMapByName.get(name_en)?.[displayNameProp] || name_en;

    return (
        <div className="suggestion-card">
            <img src={`${import.meta.env.BASE_URL}${uma?.image}`} alt={uma?.[displayNameProp]} className="suggestion-card__image" />
            <div className="suggestion-card__details">
                <p className="suggestion-card__name">{uma?.[displayNameProp]}</p>
                <p className="suggestion-card__score">{parent.score} pts</p>
                <div className="suggestion-card__sparks">
                    <SparkTag category="blue" type={parent.blueSpark.type} stars={parent.blueSpark.stars} />
                    <SparkTag category="pink" type={parent.pinkSpark.type} stars={parent.pinkSpark.stars} />
                    {parent.uniqueSparks.map(s => (
                        <SparkTag key={s.name} category="unique" type={getSkillDisplayName(s.name)} stars={s.stars} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SuggestionParentCard;