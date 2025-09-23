import React, { useState, useMemo } from 'react';
import { Parent, ValidationResult, Filters } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import ContextMenu, { MenuItem } from './common/ContextMenu';
import { useAppContext } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';
import InventoryControls, { SortFieldType, SortDirectionType, InventoryViewType } from './common/InventoryControls';
import { getLineageStats, LineageStats, countTotalLineageWhiteSparks } from '../utils/affinity';
import { calculateScore } from '../utils/scoring';

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
    searchScope: 'total',
    blueSparks: [],
    pinkSparks: [],
    uniqueSparks: [],
    whiteSparks: [],
    minWhiteSparks: 0,
};

const InventoryModal = ({ isOpen, onClose, isSelectionMode = false, onSelectParent, excludedCharacterIds = new Set() }: InventoryModalProps) => {
    const { t } = useTranslation(['roster', 'modals', 'common']);
    const { appData, activeServer, deleteParent, addParentToProfile, removeParentFromProfile, moveParentToServer, validateParentForServer, umaMapById, dataDisplayLanguage, getActiveProfile, skillMapByName } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const [moveConfirmState, setMoveConfirmState] = useState<MoveConfirmState | null>(null);
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: MenuItem[]; parent: Parent | null }>({ isOpen: false, x: 0, y: 0, items: [], parent: null });

    const [inventoryView, setInventoryView] = useState<InventoryViewType>('all');
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortField, setSortField] = useState<SortFieldType>('score');
    const [sortDirection, setSortDirection] = useState<SortDirectionType>('desc');

    const activeProfile = getActiveProfile();
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const { inventory, profiles } = useMemo(() => {
        const currentServerInventory = appData.inventory.filter(p => p.server === activeServer);
        return {
            inventory: currentServerInventory,
            profiles: appData.serverData[activeServer].profiles,
        };
    }, [appData.inventory, appData.serverData, activeServer]);

    const filteredAndSortedInventory = useMemo(() => {
        
        let viewFilteredInventory = inventory;
        if (inventoryView === 'owned') {
            viewFilteredInventory = inventory.filter(p => !p.isBorrowed);
        } else if (inventoryView === 'borrowed') {
            viewFilteredInventory = inventory.filter(p => p.isBorrowed);
        }

        const scoredInventory = activeProfile
            ? viewFilteredInventory.map(p => ({
                ...p,
                score: calculateScore(p, activeProfile.goal, appData.inventory, skillMapByName)
              }))
            : viewFilteredInventory;

        const lineageStatsCache = new Map<number, LineageStats>();
        const getCachedLineageStats = (parent: Parent) => {
            if (!lineageStatsCache.has(parent.id)) {
                lineageStatsCache.set(parent.id, getLineageStats(parent, inventoryMap));
            }
            return lineageStatsCache.get(parent.id)!;
        };

        const filtered = scoredInventory.filter(parent => {
            const uma = umaMapById.get(parent.umaId);
            const parentName = uma ? (dataDisplayLanguage === 'jp' ? uma.name_jp : uma.name_en) : parent.name;
            
            if (filters.searchTerm && !parentName.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;

            // Standardize white skill count to always use lineage
            const lineageStats = getCachedLineageStats(parent);
            if (filters.minWhiteSparks > 0 && lineageStats.whiteSkillCount < filters.minWhiteSparks) return false;

            if (filters.searchScope === 'representative') {
                if (!filters.blueSparks.every(f => parent.blueSpark.type === f.type && parent.blueSpark.stars >= f.stars)) return false;
                if (!filters.pinkSparks.every(f => parent.pinkSpark.type === f.type && parent.pinkSpark.stars >= f.stars)) return false;
                if (!filters.uniqueSparks.every(f => !f.name || parent.uniqueSparks.some(s => s.name === f.name && s.stars >= f.stars))) return false;
                if (!filters.whiteSparks.every(f => !f.name || parent.whiteSparks.some(s => s.name === f.name && s.stars >= f.stars))) return false;
            } else { // Total Lineage Search
                if (!filters.blueSparks.every(f => (lineageStats.blue[f.type] || 0) >= f.stars)) return false;
                if (!filters.pinkSparks.every(f => (lineageStats.pink[f.type] || 0) >= f.stars)) return false;
                if (!filters.uniqueSparks.every(f => !f.name || (lineageStats.unique[f.name] || 0) >= f.stars)) return false;
                if (!filters.whiteSparks.every(f => !f.name || (lineageStats.white[f.name] || 0) >= f.stars)) return false;
            }
            
            return true;
        });

        return filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'gen':
                    comparison = b.gen - a.gen;
                    break;
                case 'id':
                    comparison = b.id - a.id;
                    break;
                case 'sparks': 
                    const aSparks = countTotalLineageWhiteSparks(a, inventoryMap);
                    const bSparks = countTotalLineageWhiteSparks(b, inventoryMap);
                    comparison = bSparks - aSparks;
                    break;
                case 'score':
                default:
                    comparison = b.score - a.score;
                    break;
            }
            return sortDirection === 'desc' ? comparison : -comparison;
        });
    }, [inventory, inventoryView, filters, sortField, sortDirection, umaMapById, dataDisplayLanguage, inventoryMap, activeProfile, appData.inventory, skillMapByName]);


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
    const activeRosterIds = new Set(activeProfile?.roster || []);
    const modalTitle = isSelectionMode ? t('modals:selectGrandparentTitle') : t('inventory.title');

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="2xl">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    <div className="inventory-modal__sidebar">
                        <InventoryControls 
                            inventoryView={inventoryView}
                            setInventoryView={setInventoryView}
                            filters={filters} 
                            setFilters={setFilters} 
                            sortField={sortField} 
                            setSortField={setSortField}
                            sortDirection={sortDirection}
                            setSortDirection={setSortDirection}
                        />
                    </div>
                    <div className="inventory-modal__main-content">
                        <div className="inventory-modal__grid">
                            {filteredAndSortedInventory.length > 0 ? (
                                filteredAndSortedInventory.map(parent => {
                                    const characterId = umaMapById.get(parent.umaId)?.characterId;
                                    const isDisabled = !!characterId && excludedCharacterIds.has(characterId);
                                    
                                    return (
                                        <ParentCard 
                                            key={parent.id} 
                                            parent={parent} 
                                            displayScore={true}
                                            onEdit={() => handleOpenEditModal(parent)}
                                            onDelete={() => handleDeleteParent(parent)}
                                            onMove={() => handleMoveParent(parent)}
                                            onAssign={(e) => handleOpenAssignmentMenu(e, parent)}
                                            assignedProjects={parentToProfileMap.get(parent.id)}
                                            isSelectionMode={isSelectionMode}
                                            onSelect={onSelectParent}
                                            isDisabled={isDisabled}
                                            isInCurrentRoster={activeRosterIds.has(parent.id)}
                                        />
                                    );
                                })
                            ) : (
                                <p className="card__placeholder-text text-center py-8 col-span-full">{t('inventory.placeholder')}</p>
                            )}
                        </div>
                    </div>
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