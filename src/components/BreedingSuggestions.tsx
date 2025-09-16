import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, ManualParentData } from '../types';
import './BreedingSuggestions.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { calculateFullAffinity, resolveGrandparent } from '../utils/affinity';

const BreedingSuggestions = () => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, masterUmaList, appData, dataDisplayLanguage, umaMapById, charaRelations, relationPoints } = useAppContext();
    const roster = getScoredRoster();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const topTwoParents = useMemo(() => {
        return [...roster].sort((a, b) => b.score - a.score).slice(0, 2);
    }, [roster]);

    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const suggestions = useMemo(() => {
        if (topTwoParents.length < 2) return [];
        const [parent1, parent2] = topTwoParents;
        
        const lineageCharIds = new Set<string>();
        const lineageMembers: (Parent | ManualParentData | null)[] = [
            parent1, parent2,
            resolveGrandparent(parent1.grandparent1, inventoryMap),
            resolveGrandparent(parent1.grandparent2, inventoryMap),
            resolveGrandparent(parent2.grandparent1, inventoryMap),
            resolveGrandparent(parent2.grandparent2, inventoryMap)
        ];
        
        for (const member of lineageMembers) {
            if (member?.umaId) {
                const uma = umaMapById.get(member.umaId);
                if (uma) lineageCharIds.add(uma.characterId);
            }
        }
        
        const scoredSuggestions = masterUmaList
            .filter(uma => !lineageCharIds.has(uma.characterId)) // Anti-inbreeding filter
            .map(trainee => ({
                uma: trainee,
                score: calculateFullAffinity(trainee, parent1, parent2, charaRelations, relationPoints, inventoryMap, umaMapById)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        return scoredSuggestions.slice(0, 10);

    }, [topTwoParents, masterUmaList, inventoryMap, umaMapById, charaRelations, relationPoints]);

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