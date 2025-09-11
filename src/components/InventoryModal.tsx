import { useState, useMemo } from 'react';
import { Parent } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { useAppContext } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
    const { t } = useTranslation('roster');
    const { appData, activeServer, deleteParent, getActiveProfile } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);

    const inventory = useMemo(() => {
        return appData.inventory
            .filter(p => p.server === activeServer)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [appData.inventory, activeServer]);

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
    
    // Recalculate score for editing, as the inventory doesn't store scores
    const getParentForEditing = (parent: Parent): Parent => {
        const goal = getActiveProfile()?.goal;
        if (!goal) return parent;
        return { ...parent, score: 0 }; // Score is recalculated in context anyway
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('inventory.title')} size="xl">
                <div className="inventory-modal__grid">
                    {inventory.length > 0 ? (
                        inventory.map(parent => (
                            <ParentCard 
                                key={parent.id} 
                                parent={parent} 
                                displayScore={false}
                                onEdit={() => handleOpenEditModal(getParentForEditing(parent))}
                                onDelete={() => handleDeleteParent(parent)}
                            />
                        ))
                    ) : (
                        <p className="card__placeholder-text text-center py-8 col-span-full">{t('inventory.placeholder')}</p>
                    )}
                </div>
                <div className="inventory-modal__footer">
                    <span className="inventory-modal__count">{t('inventory.count', { count: inventory.length })}</span>
                    <button className="button button--primary" onClick={handleOpenAddModal}>{t('addParentBtn')}</button>
                </div>
            </Modal>

            <AddParentModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
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

export default InventoryModal;