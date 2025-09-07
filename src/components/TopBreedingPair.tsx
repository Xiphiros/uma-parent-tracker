import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';

const TopBreedingPair = () => {
    const { getActiveProfile } = useAppContext();
    const roster = getActiveProfile()?.roster ?? [];

    const topTwoParents = useMemo(() => {
        return [...roster].sort((a, b) => b.score - a.score).slice(0, 2);
    }, [roster]);

    return (
        <section className="card">
            <h2 className="card__title">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 card__title-icon--highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                Top Breeding Pair
            </h2>
            <div id="top-parents-container" className="space-y-4">
                {topTwoParents.length > 0 ? (
                    topTwoParents.map(parent => (
                        <ParentCard key={parent.id} parent={parent} isTopParent />
                    ))
                ) : (
                    <p className="card__placeholder-text">Add parents to your roster to see the top pair here.</p>
                )}
                {roster.length === 1 && (
                    <p className="card__placeholder-text text-sm mt-2">Add one more parent to complete the pair.</p>
                )}
            </div>
        </section>
    );
};

export default TopBreedingPair;