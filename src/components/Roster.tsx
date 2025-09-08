import { useMemo, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { Parent } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import Modal from './common/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxArchive, faPlus } from '@fortawesome/free-solid-svg-icons';

const Roster = () => {
    const { getActiveProfile, deleteParent } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
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
            <section className="lg:col-span-2 card">
                <div className="card__header">
                    <h2 className="card__title">
                        <FontAwesomeIcon icon={faBoxArchive} className="h-6 w-6 mr-2 text-teal-500" />
                        Roster
                    </h2>
                    <button id="add-parent-btn" className="button button--secondary" onClick={handleOpenAddModal}>
                        <FontAwesomeIcon icon={faPlus} className="h-5 w-5 mr-1" />
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

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Confirm Deletion"
            >
                <p className="dialog-modal__message">
                    Are you sure you want to delete "{parentToDelete?.name}"?
                </p>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
                    <button className="button button--danger" onClick={handleConfirmDelete}>Delete</button>
                </div>
            </Modal>
        </>
    );
};

export default Roster;