import { useState, useMemo } from 'react';
import { Parent, Profile } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import ContextMenu, { MenuItem } from './common/ContextMenu';
import { useAppContext } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal = ({ isOpen, onClose }: InventoryModalProps) => {
    const { t } = useTranslation('roster');
    const { appData, activeServer, deleteParent, addParentToProfile, removeParentFromProfile } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: MenuItem[]; parent: Parent | null }>({ isOpen: false, x: 0, y: 0, items: [], parent: null });

    const { inventory, profiles } = useMemo(() => {
        const currentServerInventory = appData.inventory
            .filter(p => p.server === activeServer)
            .sort((a, b) => a.name.localeCompare(b.name));
        
        const allProfiles = [...appData.profiles];
        appData.folders.forEach(f => {
            f.profileIds.forEach(pid => {
                const profile = appData.profiles.find(p => p.id === pid);
                if (profile) allProfiles.push(profile);
            });
        });
        
        return { inventory: currentServerInventory, profiles: appData.profiles };
    }, [appData.inventory, appData.profiles, appData.folders, activeServer]);

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
                            <div key={parent.id} className="relative">
                                <ParentCard 
                                    parent={parent} 
                                    displayScore={false}
                                    onEdit={() => handleOpenEditModal(parent)}
                                    onDelete={() => handleDeleteParent(parent)}
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                    <div className="text-xs text-stone-400 truncate max-w-[120px]">
                                        {parentToProfileMap.get(parent.id)?.join(', ')}
                                    </div>
                                    <button 
                                        className="button button--secondary button--small"
                                        onClick={(e) => handleOpenAssignmentMenu(e, parent)}
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                    </button>
                                </div>
                            </div>
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