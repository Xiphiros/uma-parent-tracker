import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { Parent } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import Modal from './common/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxArchive, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const Roster = () => {
    const { t } = useTranslation(['roster', 'common']);
    const { getActiveProfile, deleteParent } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const rosterContainerRef = useRef<HTMLDivElement>(null);
    
    const [isRosterScrollable, setIsRosterScrollable] = useState(false);
    useScrollLock(rosterContainerRef, isRosterScrollable);
    
    const activeProfile = getActiveProfile();
    const roster = activeProfile?.roster ?? [];

    const sortedRoster = useMemo(() => {
        return [...roster].sort((a, b) => b.score - a.score);
    }, [roster]);

    useEffect(() => {
        const checkScroll = () => {
            const element = rosterContainerRef.current;
            if (element) {
                const hasScrollbar = element.scrollHeight > element.clientHeight;
                setIsRosterScrollable(hasScrollbar);
            }
        };

        checkScroll(); // Check on initial render and when roster changes

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
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (parent: Parent) => {
        setParentToEdit(parent);
        setIsModalOpen(true);
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
                        <FontAwesomeIcon icon={faBoxArchive} className="h-6 w-6 mr-2 text-teal-500" />
                        {t('rosterTitle')}
                    </h2>
                    <button id="add-parent-btn" className="button button--secondary" onClick={handleOpenAddModal}>
                        <FontAwesomeIcon icon={faPlus} className="h-5 w-5 mr-1" />
                        {t('addParentBtn')}
                    </button>
                </div>
                <div id="roster-container" className="roster space-y-4 overflow-y-auto pr-2 flex-1 min-h-0" ref={rosterContainerRef}>
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
                        <p className="card__placeholder-text text-center py-8">{t('placeholder')}</p>
                    )}
                </div>
            </section>
            
            <AddParentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                parentToEdit={parentToEdit}
            />

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title={t('deleteConfirmTitle')}
            >
                <p className="dialog-modal__message">
                    {t('deleteConfirmMsg', { name: parentToDelete?.name })}
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