import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';

const Roster = () => {
    const { getActiveProfile } = useAppContext();
    const roster = getActiveProfile()?.roster ?? [];

    const sortedRoster = useMemo(() => {
        return [...roster].sort((a, b) => b.score - a.score);
    }, [roster]);
    
    return (
        <section className="lg:col-span-2 card">
            <div className="card__header">
                <h2 className="card__title">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" /></svg>
                    Roster
                </h2>
                <button id="add-parent-btn" className="button button--secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Parent
                </button>
            </div>
            <div id="roster-container" className="roster space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {sortedRoster.length > 0 ? (
                    sortedRoster.map(parent => (
                        <ParentCard key={parent.id} parent={parent} />
                    ))
                ) : (
                     <p className="card__placeholder-text text-center py-8">Your roster is empty. Add a parent to get started!</p>
                )}
            </div>
        </section>
    );
};

export default Roster;