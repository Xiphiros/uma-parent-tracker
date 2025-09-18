import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import './BreedingSuggestions.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { calculateFullAffinity, getLineageCharacterIds } from '../utils/affinity';

const BreedingSuggestions = () => {
    const { t } = useTranslation('roster');
    const { masterUmaList, appData, dataDisplayLanguage, umaMapById, charaRelations, relationPoints, activeBreedingPair } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const suggestions = useMemo(() => {
        if (!activeBreedingPair) return [];
        const { p1: parent1, p2: parent2 } = activeBreedingPair;
        
        const lineageCharIds = getLineageCharacterIds(parent1, parent2, inventoryMap, umaMapById);
        const lineageCharIdStrings = new Set(Array.from(lineageCharIds).map(String));
        
        const scoredSuggestions = masterUmaList
            .filter(uma => !lineageCharIdStrings.has(uma.characterId)) // Anti-inbreeding filter
            .map(trainee => ({
                uma: trainee,
                score: calculateFullAffinity(trainee, parent1, parent2, charaRelations, relationPoints, inventoryMap, umaMapById)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        return scoredSuggestions.slice(0, 10);

    }, [activeBreedingPair, masterUmaList, inventoryMap, umaMapById, charaRelations, relationPoints]);

    return (
        <section className="card">
            <h2 className="card__title">
                 <FontAwesomeIcon icon={faLightbulb} className="h-6 w-6 mr-2 card__title-icon--highlight" />
                {t('suggestions.title')}
            </h2>
            <div className="suggestions-list">
                {!activeBreedingPair ? (
                    <p className="card__placeholder-text">{t('suggestions.placeholderCarousel')}</p>
                ) : (
                    suggestions.map((item, index) => (
                        <div key={item.uma.id} className="suggestions-list__item">
                            <span className="suggestions-list__rank">#{index + 1}</span>
                            <img src={`${import.meta.env.BASE_URL}${item.uma.image}`} alt={item.uma[displayNameProp]} className="suggestions-list__image" />
                            <span className="suggestions-list__name">{item.uma[displayNameProp]}</span>
                            <span className="suggestions-list__score">{item.score} {t('parentCard.pts')}</span>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

export default BreedingSuggestions;