import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import InventoryModal from './InventoryModal';
import { Parent } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPlus, faFlask } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import BreedingPlannerModal from './BreedingPlannerModal';

const Roster = () => {
    const { t } = useTranslation(['roster', 'common']);
    const { getActiveProfile, getScoredRoster, removeParentFromProfile, getIndividualScore } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [sortMode, setSortMode] = useState<'final' | 'individual'>('final');
    const rosterContainerRef = useRef<HTMLDivElement>(null);
    
    const [isRosterScrollable, setIsRosterScrollable] = useState(false);
    useScrollLock(rosterContainerRef, isRosterScrollable);
    
    const activeProfile = getActiveProfile();
    const scoredRoster = getScoredRoster();

    const sortedRoster = useMemo(() => {
        const rosterWithIndividualScores = scoredRoster.map(p => ({
            ...p,
            individualScore: getIndividualScore(p)
        }));

        return rosterWithIndividualScores.sort((a, b) => {
            if (sortMode === 'individual') {
                return b.individualScore - a.individualScore;
            }
            return b.score - a.score; // Default to final score
        });
    }, [scoredRoster, sortMode, getIndividualScore]);

    useEffect(() => {
        const checkScroll = () => {
            const element = rosterContainerRef.current;
            if (element) {
                const hasScrollbar = element.scrollHeight > element.clientHeight;
                setIsRosterScrollable(hasScrollbar);
            }
        };

        checkScroll();
        const resizeObserver = new ResizeObserver(checkScroll);
        const element = rosterContainerRef.current;
        if (element) {
            resizeObserver.observe(element);
        }

        return () => {
            if (element) {
                resizeObserver.unobserve(element);
            }
        };
    }, [sortedRoster]);


    const handleOpenAddModal = () => {
        setParentToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (parent: Parent) => {
        setParentToEdit(parent);
        setIsAddModalOpen(true);
    };

    const handleRemoveFromRoster = (parent: Parent) => {
        if (activeProfile) {
            removeParentFromProfile(parent.id, activeProfile.id);
        }
    };
    
    return (
        <>
            <section className="lg:col-span-2 card flex flex-col">
                <div className="card__header">
                    <h2 className="card__title">
                        {t('rosterTitle', { projectName: activeProfile?.name })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="top-pair__toggle-group">
                            <span className="top-pair__toggle-btn !cursor-default">{t('rosterSortBy')}</span>
                            <button className={`top-pair__toggle-btn ${sortMode === 'final' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortMode('final')}>{t('finalScore')}</button>
                            <button className={`top-pair__toggle-btn ${sortMode === 'individual' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortMode('individual')}>{t('individualScore')}</button>
                        </div>
                         <button className="button button--neutral" onClick={() => setIsPlannerModalOpen(true)}>
                            <FontAwesomeIcon icon={faFlask} className="h-5 w-5 mr-1" />
                            {t('breedingPlanner.title')}
                        </button>
                        <button className="button button--neutral" onClick={() => setIsInventoryModalOpen(true)}>
                            <FontAwesomeIcon icon={faUsers} className="h-5 w-5 mr-1" />
                            {t('inventory.manageBtn')}
                        </button>
                        <button id="add-parent-btn" className="button button--secondary" onClick={handleOpenAddModal}>
                            <FontAwesomeIcon icon={faPlus} className="h-5 w-5 mr-1" />
                            {t('addParentBtn')}
                        </button>
                    </div>
                </div>
                <div id="roster-container" className="roster space-y-4 overflow-y-auto pr-2 flex-1 min-h-0" ref={rosterContainerRef}>
                    {sortedRoster.length > 0 ? (
                        sortedRoster.map(parent => (
                            <ParentCard 
                                key={parent.id} 
                                parent={parent} 
                                onEdit={() => handleOpenEditModal(parent)}
                                onDelete={() => handleRemoveFromRoster(parent)}
                            />
                        ))
                    ) : (
                        <p className="card__placeholder-text text-center py-8">{t('placeholderRoster')}</p>
                    )}
                </div>
            </section>
            
            <AddParentModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                parentToEdit={parentToEdit}
            />

            <InventoryModal
                isOpen={isInventoryModalOpen}
                onClose={() => setIsInventoryModalOpen(false)}
            />

            <BreedingPlannerModal
                isOpen={isPlannerModalOpen}
                onClose={() => setIsPlannerModalOpen(false)}
            />
        </>
    );
};

export default Roster;