import React, { useState, useMemo } from 'react';
import { Parent, ValidationResult } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import ContextMenu, { MenuItem } from './common/ContextMenu';
import { useAppContext } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';
import InventoryControls, { Filters, SortByType } from './common/InventoryControls';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSelectionMode?: boolean;
  onSelectParent?: (parent: Parent) => void;
  excludedCharacterIds?: Set<string>;
}

interface MoveConfirmState {
    parent: Parent;
    result: ValidationResult;
}

const initialFilters: Filters = {
    searchTerm: '',
    blueSpark: { type: 'all', stars: 0 },
    pinkSpark: { type: 'all', stars: 0 },
    uniqueSpark: '',
    whiteSpark: '',
};

const InventoryModal = ({ isOpen, onClose, isSelectionMode = false, onSelectParent, excludedCharacterIds = new Set() }: InventoryModalProps) => {
    const { t } = useTranslation(['roster', 'modals', 'common']);
    const { appData, activeServer, deleteParent, addParentToProfile, removeParentFromProfile, moveParentToServer, validateParentForServer, umaMapById, dataDisplayLanguage, getActiveProfile } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const [moveConfirmState, setMoveConfirmState] = useState<MoveConfirmState | null>(null);
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: MenuItem[]; parent: Parent | null }>({ isOpen: false, x: 0, y: 0, items: [], parent: null });

    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortBy, setSortBy] = useState<SortByType>('score');

    const activeProfile = getActiveProfile();

    const { inventory, profiles, inventoryWithScores } = useMemo(() => {
        const currentServerInventory = appData.inventory.filter(p => p.server === activeServer);
        
        // Pre-calculate scores if sorting by score
        const scoredInventory = sortBy === 'score' && activeProfile
            ? currentServerInventory.map(p => ({
                ...p,
                score: appData.inventory.find(inv => inv.id === p.id)?.score || 0
            }))
            : currentServerInventory;

        return {
            inventory: currentServerInventory,
            profiles: appData.serverData[activeServer].profiles,
            inventoryWithScores: scoredInventory
        };
    }, [appData.inventory, appData.serverData, activeServer, sortBy, activeProfile]);

    const filteredAndSortedInventory = useMemo(() => {
        const sourceInventory = sortBy === 'score' ? inventoryWithScores : inventory;

        const filtered = sourceInventory.filter(parent => {
            const uma = umaMapById.get(parent.umaId);
            const parentName = uma ? (dataDisplayLanguage === 'jp' ? uma.name_jp : uma.name_en) : parent.name;
            
            if (filters.searchTerm && !parentName.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
            if (filters.blueSpark.type !== 'all' && parent.blueSpark.type !== filters.blueSpark.type) return false;
            if (filters.blueSpark.stars > 0 && parent.blueSpark.stars < filters.blueSpark.stars) return false;
            if (filters.pinkSpark.type !== 'all' && parent.pinkSpark.type !== filters.pinkSpark.type) return false;
            if (filters.pinkSpark.stars > 0 && parent.pinkSpark.stars < filters.pinkSpark.stars) return false;
            if (filters.uniqueSpark && !parent.uniqueSparks.some(s => s.name === filters.uniqueSpark)) return false;
            if (filters.whiteSpark && !parent.whiteSparks.some(s => s.name === filters.whiteSpark)) return false;

            return true;
        });

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'gen': return b.gen - a.gen;
                case 'id': return b.id - a.id;
                case 'sparks': 
                    const aSparks = a.uniqueSparks.length + a.whiteSparks.length;
                    const bSparks = b.uniqueSparks.length + b.whiteSparks.length;
                    return bSparks - aSparks;
                case 'score':
                default:
                    return b.score - a.score;
            }
        });
    }, [inventory, inventoryWithScores, filters, sortBy, umaMapById, dataDisplayLanguage]);


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
        const result = validateParentForServer(parent.id);
        setMoveConfirmState({ parent, result });
    };

    const handleConfirmMove = () => {
        if (moveConfirmState) {
            moveParentToServer(moveConfirmState.parent.id);
            setMoveConfirmState(null);
        }
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

    const destServer = activeServer === 'jp' ? 'Global' : 'JP';
    
    const getParentDisplayName = (parent: Parent | null): string => {
        if (!parent) return '';
        const uma = umaMapById.get(parent.umaId);
        if (!uma) return parent.name;
        return dataDisplayLanguage === 'jp' ? uma.name_jp : uma.name_en;
    };
    
    const parentDisplayName = getParentDisplayName(moveConfirmState?.parent || null);

    const modalTitle = isSelectionMode ? t('modals:selectGrandparentTitle') : t('inventory.title');

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
                <InventoryControls filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} />

                <div className="inventory-modal__grid">
                    {filteredAndSortedInventory.length > 0 ? (
                        filteredAndSortedInventory.map(parent => {
                            const characterId = umaMapById.get(parent.umaId)?.characterId;
                            const isDisabled = !!characterId && excludedCharacterIds.has(characterId);
                            return (
                                <ParentCard 
                                    key={parent.id} 
                                    parent={parent} 
                                    displayScore={sortBy === 'score'}
                                    onEdit={() => handleOpenEditModal(parent)}
                                    onDelete={() => handleDeleteParent(parent)}
                                    onMove={() => handleMoveParent(parent)}
                                    onAssign={(e) => handleOpenAssignmentMenu(e, parent)}
                                    assignedProjects={parentToProfileMap.get(parent.id)}
                                    isSelectionMode={isSelectionMode}
                                    onSelect={onSelectParent}
                                    isDisabled={isDisabled}
                                />
                            );
                        })
                    ) : (
                        <p className="card__placeholder-text text-center py-8 col-span-full">{t('inventory.placeholder')}</p>
                    )}
                </div>
                <div className="inventory-modal__footer">
                    <span className="inventory-modal__count">{t('inventory.count', { count: filteredAndSortedInventory.length })}</span>
                    {isSelectionMode ? (
                        <button className="button button--neutral" onClick={onClose}>{t('common:close')}</button>
                    ) : (
                        <button className="button button--primary" onClick={handleOpenAddModal}>{t('addParentBtn')}</button>
                    )}
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

            {moveConfirmState && (
                <Modal
                    isOpen={!!moveConfirmState}
                    onClose={() => setMoveConfirmState(null)}
                    title={moveConfirmState.result.errors.length > 0 ? t('modals:moveParentWarningTitle') : t('modals:moveParentConfirmTitle')}
                >
                    {moveConfirmState.result.errors.length > 0 ? (
                        <div>
                            <p className="dialog-modal__message">{t('modals:moveParentWarningMsg', { name: parentDisplayName, server: destServer })}</p>
                            <ul className="list-disc list-inside text-sm text-red-500 bg-red-500/10 p-2 rounded">
                                {moveConfirmState.result.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    ) : (
                        <p className="dialog-modal__message">{t('modals:moveParentConfirmMsg', { name: parentDisplayName, server: destServer })}</p>
                    )}
                    <div className="dialog-modal__footer">
                        <button className="button button--neutral" onClick={() => setMoveConfirmState(null)}>{t('common:cancel')}</button>
                        <button 
                            className="button button--primary" 
                            onClick={handleConfirmMove}
                            disabled={moveConfirmState.result.errors.length > 0}
                        >
                            {t('common:confirm')}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default InventoryModal;