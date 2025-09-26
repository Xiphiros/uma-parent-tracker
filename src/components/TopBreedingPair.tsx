import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Parent, BreedingPair } from '../types';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faClipboardQuestion, faCalculator } from '@fortawesome/free-solid-svg-icons';
import { countTotalLineageWhiteSparks, countUniqueCombinedLineageWhiteSparks } from '../utils/affinity';
import { calculateScore } from '../utils/scoring';
import PairedParentCard from './common/PairedParentCard';
import ParentDetailModal from './ParentDetailModal';
import MissingSkillsModal from './MissingSkillsModal';
import ProbabilityCalculatorModal from './ProbabilityCalculatorModal';

type RecommendationType = 'owned' | 'borrowed';
type SortByType = 'finalScore' | 'individualScore';

interface BreedingPairWithStats extends BreedingPair {
    avgFinalScore: number;
    avgIndividualScore: number;
    totalSparks: number;
    uniqueSparks: number;
}

const TOP_K = 20; // Limit the number of pairs to calculate and sort

const TopBreedingPair = () => {
    const { t } = useTranslation('roster');
    const { getScoredRoster, appData, activeServer, setActiveBreedingPair, getActiveProfile, umaMapById, skillMapByName, getIndividualScore } = useAppContext();
    const roster = useMemo(() => getScoredRoster(), [getScoredRoster]);
    const activeGoal = getActiveProfile()?.goal;

    const [recType, setRecType] = useState<RecommendationType>('owned');
    const [sortBy, setSortBy] = useState<SortByType>('finalScore');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [detailModalParent, setDetailModalParent] = useState<Parent | null>(null);
    const [isMissingSkillsModalOpen, setIsMissingSkillsModalOpen] = useState(false);
    const [isProbCalcModalOpen, setIsProbCalcModalOpen] = useState(false);
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const recommendedPairs = useMemo<BreedingPairWithStats[]>(() => {
        if (!activeGoal) return [];
        
        const topPairs: BreedingPairWithStats[] = [];
        const individualScores = new Map(roster.map(p => [p.id, getIndividualScore(p)]));

        const comparePairs = (a: BreedingPairWithStats, b: BreedingPairWithStats) => {
            if (sortBy === 'individualScore') {
                if (b.avgIndividualScore !== a.avgIndividualScore) return b.avgIndividualScore - a.avgIndividualScore;
                return b.totalSparks - a.totalSparks;
            } else { // 'finalScore'
                if (b.avgFinalScore !== a.avgFinalScore) return b.avgFinalScore - a.avgFinalScore;
                return b.totalSparks - a.totalSparks;
            }
        };

        const processPair = (p1: Parent, p2: Parent, p2IndividualScore: number) => {
            const p1CharId = umaMapById.get(p1.umaId)?.characterId;
            const p2CharId = umaMapById.get(p2.umaId)?.characterId;
            if (p1CharId === p2CharId) return;

            const newPair: BreedingPairWithStats = {
                p1, p2,
                avgFinalScore: Math.round((p1.score + p2.score) / 2),
                avgIndividualScore: Math.round(((individualScores.get(p1.id) || 0) + p2IndividualScore) / 2),
                totalSparks: countTotalLineageWhiteSparks(p1, inventoryMap) + countTotalLineageWhiteSparks(p2, inventoryMap),
                uniqueSparks: countUniqueCombinedLineageWhiteSparks(p1, p2, inventoryMap)
            };

            if (topPairs.length < TOP_K) {
                topPairs.push(newPair);
                topPairs.sort(comparePairs);
            } else {
                const worstPair = topPairs[TOP_K - 1];
                if (comparePairs(newPair, worstPair) < 0) {
                    topPairs[TOP_K - 1] = newPair;
                    topPairs.sort(comparePairs);
                }
            }
        };

        if (recType === 'owned') {
            if (roster.length < 2) return [];
            for (let i = 0; i < roster.length; i++) {
                for (let j = i + 1; j < roster.length; j++) {
                    processPair(roster[i], roster[j], individualScores.get(roster[j].id) || 0);
                }
            }
        } else { // 'borrowed'
            const ownedRosterParents = roster.filter(p => !p.isBorrowed);
            const borrowedParents = appData.inventory
                .filter(p => p.isBorrowed && p.server === activeServer)
                .map(p => ({ 
                    ...p, 
                    score: calculateScore(p, activeGoal, appData.inventory, skillMapByName),
                    individualScore: getIndividualScore(p)
                }));
            
            if (ownedRosterParents.length < 1 || borrowedParents.length < 1) return [];

            for (const p1 of ownedRosterParents) {
                for (const p2 of borrowedParents) {
                    processPair(p1, p2, p2.individualScore);
                }
            }
        }

        return topPairs;

    }, [roster, recType, sortBy, appData.inventory, activeServer, inventoryMap, activeGoal, umaMapById, skillMapByName, getIndividualScore]);

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
    const totalWishlistCount = activeGoal ? activeGoal.uniqueWishlist.length + activeGoal.wishlist.length : 0;

    return (
        <>
            <section className="card">
                <h2 className="card__title">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 card__title-icon--highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    {t('topPairTitle')}
                </h2>
                <div className="top-pair__controls">
                    <div className="top-pair__toggle-group">
                        <button className={`top-pair__toggle-btn ${recType === 'owned' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setRecType('owned')}>{t('topPair.ownedXowned')}</button>
                        <button className={`top-pair__toggle-btn ${recType === 'borrowed' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setRecType('borrowed')}>{t('topPair.ownedXborrowed')}</button>
                    </div>
                     <div className="top-pair__toggle-group">
                        <span className="top-pair__toggle-btn !cursor-default">{t('topPair.sortBy')}</span>
                        <button className={`top-pair__toggle-btn ${sortBy === 'finalScore' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortBy('finalScore')}>{t('topPair.avgFinalScore')}</button>
                        <button className={`top-pair__toggle-btn ${sortBy === 'individualScore' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortBy('individualScore')}>{t('topPair.avgIndivScore')}</button>
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
                                    <PairedParentCard parent={currentPair.p1} onDetailsClick={() => setDetailModalParent(currentPair.p1)} />
                                    <PairedParentCard parent={currentPair.p2} onDetailsClick={() => setDetailModalParent(currentPair.p2)} />
                                </div>
                                <div className="top-pair__meta">
                                    <span>{t('topPair.pair')} {currentIndex + 1} {t('topPair.of')} {recommendedPairs.length}</span>
                                    <span className="mx-2">|</span>
                                    <span>{t('topPair.avgFinalScore')}: {currentPair.avgFinalScore}</span>
                                    <span className="mx-2">|</span>
                                    <span>{t('topPair.avgIndivScore')}: {currentPair.avgIndividualScore}</span>
                                     <span className="mx-2">|</span>
                                    <span>{t('inventory.sortOptions.sparks')}: {currentPair.totalSparks}</span>
                                    <button 
                                        className="top-pair__action-btn" 
                                        onClick={() => setIsMissingSkillsModalOpen(true)}
                                        disabled={totalWishlistCount === 0}
                                        title={t('topPair.viewMissing')}
                                    >
                                        <FontAwesomeIcon icon={faClipboardQuestion} />
                                    </button>
                                    <button
                                        className="top-pair__action-btn"
                                        onClick={() => setIsProbCalcModalOpen(true)}
                                        title={t('breedingPlanner.probabilityCalculator')}
                                    >
                                        <FontAwesomeIcon icon={faCalculator} />
                                    </button>
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

            <ParentDetailModal 
                isOpen={!!detailModalParent}
                onClose={() => setDetailModalParent(null)}
                parent={detailModalParent}
            />

            <MissingSkillsModal
                isOpen={isMissingSkillsModalOpen}
                onClose={() => setIsMissingSkillsModalOpen(false)}
                pair={currentPair}
            />
            
            <ProbabilityCalculatorModal
                isOpen={isProbCalcModalOpen}
                onClose={() => setIsProbCalcModalOpen(false)}
                pair={currentPair}
            />
        </>
    );
};

export default TopBreedingPair;