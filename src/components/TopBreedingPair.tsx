import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent } from '../types';
import ParentCard from './ParentCard';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { countUniqueInheritableSkills } from '../utils/affinity';

type RecommendationType = 'owned' | 'borrowed';
type SortByType = 'score' | 'sparks';

interface BreedingPair {
    p1: Parent;
    p2: Parent;
    avgScore: number;
    totalSparks: number;
}

const TopBreedingPair = () => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, appData, activeServer, setActiveBreedingPair } = useAppContext();
    const roster = getScoredRoster();

    const [recType, setRecType] = useState<RecommendationType>('owned');
    const [sortBy, setSortBy] = useState<SortByType>('score');
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const recommendedPairs = useMemo<BreedingPair[]>(() => {
        const pairs: BreedingPair[] = [];
        
        if (recType === 'owned') {
            if (roster.length < 2) return [];
            for (let i = 0; i < roster.length; i++) {
                for (let j = i + 1; j < roster.length; j++) {
                    const p1 = roster[i];
                    const p2 = roster[j];
                    pairs.push({
                        p1, p2,
                        avgScore: Math.round((p1.score + p2.score) / 2),
                        totalSparks: countUniqueInheritableSkills(p1, p2, inventoryMap)
                    });
                }
            }
        } else { // 'borrowed'
            const borrowedParents = appData.inventory.filter(p => p.isBorrowed && p.server === activeServer);
            if (roster.length < 1 || borrowedParents.length < 1) return [];

            for (const p1 of roster) {
                for (const p2 of borrowedParents) {
                     pairs.push({
                        p1, p2,
                        avgScore: Math.round((p1.score + p2.score) / 2),
                        totalSparks: countUniqueInheritableSkills(p1, p2, inventoryMap)
                    });
                }
            }
        }

        return pairs.sort((a, b) => {
            if (sortBy === 'score') {
                if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
                return b.totalSparks - a.totalSparks;
            } else { // 'sparks'
                if (b.totalSparks !== a.totalSparks) return b.totalSparks - a.totalSparks;
                return b.avgScore - a.avgScore;
            }
        });

    }, [roster, recType, sortBy, appData.inventory, activeServer, inventoryMap]);

    useEffect(() => {
        setCurrentIndex(0);
    }, [recType, sortBy]);

    useEffect(() => {
        const activePair = recommendedPairs[currentIndex];
        if (activePair) {
            setActiveBreedingPair({ p1: activePair.p1, p2: activePair.p2 });
        } else {
            setActiveBreedingPair(null);
        }
    }, [currentIndex, recommendedPairs, setActiveBreedingPair]);

    const handlePrev = () => setCurrentIndex(prev => (prev > 0 ? prev - 1 : recommendedPairs.length - 1));
    const handleNext = () => setCurrentIndex(prev => (prev < recommendedPairs.length - 1 ? prev + 1 : 0));

    const currentPair = recommendedPairs[currentIndex];

    return (
        <section className="card">
            <h2 className="card__title">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 card__title-icon--highlight" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                {t('topPairTitle')}
            </h2>
            <div className="top-pair__controls">
                <div className="top-pair__toggle-group">
                    <button className={`top-pair__toggle-btn ${recType === 'owned' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setRecType('owned')}>{t('topPair.ownedXowned')}</button>
                    <button className={`top-pair__toggle-btn ${recType === 'borrowed' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setRecType('borrowed')}>{t('topPair.ownedXborrowed')}</button>
                </div>
                 <div className="top-pair__toggle-group">
                    <span className="top-pair__toggle-btn !cursor-default">{t('topPair.sortBy')}</span>
                    <button className={`top-pair__toggle-btn ${sortBy === 'score' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortBy('score')}>{t('topPair.avgScore')}</button>
                    <button className={`top-pair__toggle-btn ${sortBy === 'sparks' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortBy('sparks')}>{t('topPair.totalSparks')}</button>
                </div>
            </div>
            
            <div className="top-pair__carousel">
                <button className="top-pair__nav-btn" onClick={handlePrev} disabled={recommendedPairs.length < 2}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="top-pair__content">
                    {currentPair ? (
                        <>
                            <div className="top-pair__pair-container">
                                <ParentCard parent={currentPair.p1} isTopParent />
                                <ParentCard parent={currentPair.p2} isTopParent />
                            </div>
                            <div className="top-pair__meta">
                                <span>{t('topPair.pair')} {currentIndex + 1} {t('topPair.of')} {recommendedPairs.length}</span>
                                <span className="mx-2">|</span>
                                <span>{t('topPair.avgScore')}: {currentPair.avgScore}</span>
                                <span className="mx-2">|</span>
                                <span>{t('topPair.totalSparks')}: {currentPair.totalSparks}</span>
                            </div>
                        </>
                    ) : (
                        <p className="card__placeholder-text">{t('topPairPlaceholder')}</p>
                    )}
                </div>

                <button className="top-pair__nav-btn" onClick={handleNext} disabled={recommendedPairs.length < 2}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>
        </section>
    );
};

export default TopBreedingPair;