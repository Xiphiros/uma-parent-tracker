import React, { useState, useMemo } from 'react';
import { Parent } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import ContextMenu, { MenuItem } from './common/ContextMenu';
import { useAppContext } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MoveState {
    parent: Parent | null;
    errors: string[];
}

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
    const { t } = useTranslation(['roster', 'modals']);
    const { appData, activeServer, deleteParent, addParentToProfile, removeParentFromProfile, moveParentToServer } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: MenuItem[]; parent: Parent | null }>({ isOpen: false, x: 0, y: 0, items: [], parent: null });

    const { inventory, profiles } = useMemo(() => {
        const currentServerInventory = appData.inventory
            .filter(p => p.server === activeServer)
            .sort((a, b) => a.name.localeCompare(b.name));
        
        return { inventory: currentServerInventory, profiles: appData.serverData[activeServer].profiles };
    }, [appData.inventory, appData.serverData, activeServer]);

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
    
    const handleMoveParent = (parent: Parent) => {
        const result = moveParentToServer(parent.id);
        setMoveState({ parent, errors: result.errors });
    };

    const handleOpenAssignmentMenu = (e: React.MouseEvent, parent: Parent) => {
        e.preventDefault();
        e.stopPropagation();

        const menuItems: MenuItem[] = profiles.map(profile => ({
            label: profile.name,
            onClick: () => {
                if (profile.roster.includes(parent.id)) {
                    removeParentFromProfile(parent.id, profile.id);
                } else {
                    addParentToProfile(parent.id, profile.id);
                }
            },
            type: 'checkbox',
            checked: profile.roster.includes(parent.id)
        }));

        setContextMenu({ isOpen: true, x: e.pageX, y: e.pageY, items: menuItems, parent });
    };

    const parentToProfileMap = useMemo(() => {
        const map = new Map<number, string[]>();
        profiles.forEach(profile => {
            profile.roster.forEach(parentId => {
                if (!map.has(parentId)) map.set(parentId, []);
                map.get(parentId)!.push(profile.name);
            });
        });
        return map;
    }, [profiles]);

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
                                onEdit={() => handleOpenEditModal(parent)}
                                onDelete={() => handleDeleteParent(parent)}
                                onMove={() => handleMoveParent(parent)}
                                onAssign={(e) => handleOpenAssignmentMenu(e, parent)}
                                assignedProjects={parentToProfileMap.get(parent.id)}
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

            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={{ x: contextMenu.x, y: contextMenu.y }}
                items={contextMenu.items}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
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

            {moveState && (
                <Modal
                    isOpen={!!moveState}
                    onClose={() => setMoveState(null)}
                    title={moveState.errors.length > 0 ? t('modals:moveErrorTitle') : t('modals:moveSuccessTitle')}
                >
                    {moveState.errors.length > 0 ? (
                        <div>
                            <p className="dialog-modal__message">{t('modals:moveErrorMsg', { name: moveState.parent?.name })}</p>
                            <ul className="list-disc list-inside text-sm text-red-500 bg-red-500/10 p-2 rounded">
                                {moveState.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    ) : (
                        <p className="dialog-modal__message">{t('modals:moveSuccessMsg', { name: moveState.parent?.name })}</p>
                    )}
                    <div className="dialog-modal__footer">
                        <button className="button button--primary" onClick={() => setMoveState(null)}>{t('common:ok')}</button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default InventoryModal;