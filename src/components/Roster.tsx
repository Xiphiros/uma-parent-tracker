import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { Parent } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFlask, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import BreedingPlannerModal from './BreedingPlannerModal';
import Modal from './common/Modal';
import './Roster.css';

const ITEMS_PER_PAGE = 12;

const Roster = () => {
    const { t } = useTranslation(['roster', 'common']);
    const { 
        getActiveProfile, deleteParent, appData,
        sortedParentIds, sortField, setSortField, inventoryView, setInventoryView
    } = useAppContext();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const rosterContainerRef = useRef<HTMLDivElement>(null);
    
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    
    const [isRosterScrollable, setIsRosterScrollable] = useState(false);
    useScrollLock(rosterContainerRef, isRosterScrollable);

    const [currentPage, setCurrentPage] = useState(1);
    
    const activeProfile = getActiveProfile();
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const { paginatedRoster, totalPages, totalCount } = useMemo(() => {
        const parentObjects = sortedParentIds.map(id => inventoryMap.get(id)).filter((p): p is Parent => !!p);
        const totalPages = Math.ceil(parentObjects.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedRoster = parentObjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        return { paginatedRoster, totalPages, totalCount: parentObjects.length };
    }, [sortedParentIds, inventoryMap, currentPage]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

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
    }, [paginatedRoster]);


    const handleOpenAddModal = () => {
        setParentToEdit(null);
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (parent: Parent) => {
        setParentToEdit(parent);
        setIsAddModalOpen(true);
    };

    const handleDeleteParent = (parent: Parent) => {
        setParentToDelete(parent);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (parentToDelete) {
            deleteParent(parentToDelete.id);
        }
        setParentToDelete(null);
        setDeleteConfirmOpen(false);
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
                            <button className={`top-pair__toggle-btn ${sortField === 'score' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortField('score')}>{t('finalScore')}</button>
                            <button className={`top-pair__toggle-btn ${sortField === 'individualScore' ? 'top-pair__toggle-btn--active' : ''}`} onClick={() => setSortField('individualScore')}>{t('individualScore')}</button>
                        </div>
                         <button className="button button--neutral" onClick={() => setIsPlannerModalOpen(true)}>
                            <FontAwesomeIcon icon={faFlask} className="h-5 w-5 mr-1" />
                            {t('breedingPlanner.title')}
                        </button>
                        <button id="add-parent-btn" className="button button--secondary" onClick={handleOpenAddModal}>
                            <FontAwesomeIcon icon={faPlus} className="h-5 w-5 mr-1" />
                            {t('addParentBtn')}
                        </button>
                    </div>
                </div>
                <div className="roster__controls">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="form__checkbox"
                            checked={inventoryView === 'borrowed'}
                            onChange={(e) => setInventoryView(e.target.checked ? 'borrowed' : 'all')}
                        />
                        <span className="form__label !mb-0">{t('inventory.showBorrowed')}</span>
                    </label>
                </div>
                <div id="roster-container" className="roster space-y-4 overflow-y-auto pr-2 flex-1 min-h-0" ref={rosterContainerRef}>
                    {paginatedRoster.length > 0 ? (
                        paginatedRoster.map(parent => (
                            <ParentCard 
                                key={parent.id} 
                                parent={parent} 
                                onEdit={() => handleOpenEditModal(parent)}
                                onDelete={() => handleDeleteParent(parent)}
                            />
                        ))
                    ) : (
                        <p className="card__placeholder-text text-center py-8">{t('placeholderRoster')}</p>
                    )}
                </div>
                <div className="roster__footer">
                    <span className="inventory-modal__count">{t('inventory.count', { count: totalCount })}</span>
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button className="button button--secondary button--small" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <span className="pagination-controls__text">Page {currentPage} of {totalPages}</span>
                            <button className="button button--secondary button--small" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                    )}
                </div>
            </section>
            
            <AddParentModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                parentToEdit={parentToEdit}
            />

            <BreedingPlannerModal
                isOpen={isPlannerModalOpen}
                onClose={() => setIsPlannerModalOpen(false)}
            />

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title={t('modals:deleteConfirmTitle')}
            >
                <p className="dialog-modal__message">
                    {t('modals:deleteConfirmMsg', { name: parentToDelete?.name })}
                </p>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setDeleteConfirmOpen(false)}>{t('common:cancel')}</button>
                    <button className="button button--danger" onClick={handleConfirmDelete}>{t('common:delete')}</button>
                </div>
            </Modal>
        </>
    );
};

export default Roster;