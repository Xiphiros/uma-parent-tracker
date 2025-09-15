import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, Uma, Grandparent, ManualParentData } from '../types';
import './BreedingSuggestions.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';

const BreedingSuggestions = () => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, masterUmaList, affinityData, appData, dataDisplayLanguage, umaMapById } = useAppContext();
    const roster = getScoredRoster();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const topTwoParents = useMemo(() => {
        return [...roster].sort((a, b) => b.score - a.score).slice(0, 2);
    }, [roster]);

    const suggestions = useMemo(() => {
        if (topTwoParents.length < 2 || !affinityData) return [];

        const [parent1, parent2] = topTwoParents;

        // Get character IDs of all four grandparents to prevent inbreeding
        const grandparentCharIds = new Set<string>();
        const inventoryMap = new Map(appData.inventory.map(p => [p.id, p]));

        const addGrandparent = (gp: Grandparent | undefined) => {
            if (!gp) return;
            let gpData: Parent | ManualParentData | undefined;
            if (typeof gp === 'number') {
                gpData = inventoryMap.get(gp);
            } else {
                gpData = gp;
            }
            if (gpData?.umaId) {
                const uma = umaMapById.get(gpData.umaId);
                if (uma) grandparentCharIds.add(uma.characterId);
            }
        };

        addGrandparent(parent1.grandparent1);
        addGrandparent(parent1.grandparent2);
        addGrandparent(parent2.grandparent2);
        addGrandparent(parent2.grandparent1);
        
        const parent1Char = umaMapById.get(parent1.umaId);
        const parent2Char = umaMapById.get(parent2.umaId);
        if (!parent1Char || !parent2Char) return [];

        const scoredSuggestions = masterUmaList
            .filter(uma => !grandparentCharIds.has(uma.characterId)) // Anti-inbreeding filter
            .map(trainee => {
                const traineeAffinity = affinityData[trainee.characterId];
                if (!traineeAffinity) return { uma: trainee, score: 0 };
                
                const score1 = traineeAffinity[parent1Char.characterId] ?? 0;
                const score2 = traineeAffinity[parent2Char.characterId] ?? 0;
                
                return { uma: trainee, score: score1 + score2 };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        return scoredSuggestions.slice(0, 10);

    }, [topTwoParents, masterUmaList, affinityData, appData.inventory, umaMapById]);

    return (
        <section className="card">
            <h2 className="card__title">
                 <FontAwesomeIcon icon={faLightbulb} className="h-6 w-6 mr-2 card__title-icon--highlight" />
                {t('suggestions.title')}
            </h2>
            <div className="suggestions-list">
                {topTwoParents.length < 2 ? (
                    <p className="card__placeholder-text">{t('suggestions.placeholder')}</p>
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