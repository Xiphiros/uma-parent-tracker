import { useMemo, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { Parent } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';

const Roster = () => {
    const { getActiveProfile, deleteParent } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const rosterContainerRef = useRef<HTMLDivElement>(null);
    useScrollLock(rosterContainerRef);
    
    const activeProfile = getActiveProfile();
    const roster = activeProfile?.roster ?? [];

    const sortedRoster = useMemo(() => {
        return [...roster].sort((a, b) => b.score - a.score);
    }, [roster]);

    const handleOpenAddModal = () => {
        setParentToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (parent: Parent) => {
        setParentToEdit(parent);
        setIsModalOpen(true);
    };

    const handleDeleteParent = (parent: Parent) => {
        if (window.confirm(`Are you sure you want to delete "${parent.name}"?`)) {
            deleteParent(parent.id);
        }
    };
    
    return (
        <>
            <section className="lg:col-span-2 card">
                <div className="card__header">
                    <h2 className="card__title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 mr-2 text-teal-500">
                          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
                          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.914 9H3.086Zm6.134 4.5a.75.75 0 0 1 .75-.75h2.06a.75.75 0 0 1 0 1.5H9.97a.75.75 0 0 1-.75-.75Zm-2.25 4.5a.75.75 0 0 1 .75-.75h6.56a.75.75 0 0 1 0 1.5H7.72a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                        </svg>
                        Roster
                    </h2>
                    <button id="add-parent-btn" className="button button--secondary" onClick={handleOpenAddModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Add Parent
                    </button>
                </div>
                <div id="roster-container" className="roster space-y-4 max-h-[70vh] overflow-y-auto pr-2" ref={rosterContainerRef}>
                    {sortedRoster.length > 0 ? (
                        sortedRoster.map(parent => (
                            <ParentCard 
                                key={parent.id} 
                                parent={parent} 
                                onEdit={() => handleOpenEditModal(parent)}
                                onDelete={() => handleDeleteParent(parent)}
                            />
                        ))
                    ) : (
                        <p className="card__placeholder-text text-center py-8">Your roster is empty. Add a parent to get started!</p>
                    )}
                </div>
            </section>
            
            <AddParentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                parentToEdit={parentToEdit}
            />
        </>
    );
};

export default Roster;