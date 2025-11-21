import { useState, useMemo, useEffect } from 'react';
import { Parent, ValidationResult, Filters, SortFieldType, SortDirectionType, InventoryViewType, ManualParentData, WhiteSpark, UniqueSpark } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { useAppContext, initialFilters } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import InventoryControls from './common/InventoryControls';
import { calculateIndividualScore, calculateScore } from '../utils/scoring';
import { countTotalLineageWhiteSparks, getLineageStats, resolveGrandparent } from '../utils/affinity';

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

const ITEMS_PER_PAGE = 12;

const InventoryModal = ({ isOpen, onClose, isSelectionMode = false, onSelectParent, excludedCharacterIds = new Set() }: InventoryModalProps) => {
    const { t } = useTranslation(['roster', 'modals', 'common']);
    const { 
        appData, deleteParent, moveParentToServer, validateParentForServer, umaMapById, getUmaDisplayName,
        getActiveProfile, masterSkillList, skillMapByName, activeServer
    } = useAppContext();

    // Local State for Independent Filtering
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [sortField, setSortField] = useState<SortFieldType>('score');
    const [sortDirection, setSortDirection] = useState<SortDirectionType>('desc');
    const [inventoryView, setInventoryView] = useState<InventoryViewType>('all');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const [moveConfirmState, setMoveConfirmState] = useState<MoveConfirmState | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);
    const activeProfile = getActiveProfile();
    const goal = activeProfile?.goal;

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortField, sortDirection, inventoryView]);

    // --- Filtering Logic (Ported from Worker) ---
    const processedInventory = useMemo(() => {
        let viewFiltered = appData.inventory.filter(p => p.server === activeServer);
        
        // 1. View Scope
        if (inventoryView === 'owned') viewFiltered = viewFiltered.filter(p => !p.isBorrowed);
        if (inventoryView === 'borrowed') viewFiltered = viewFiltered.filter(p => p.isBorrowed);

        // Lineage Stats Cache for performance within this memo
        const lineageStatsCache = new Map<number, ReturnType<typeof getLineageStats>>();
        const getCachedLineageStats = (p: Parent) => {
            if (!lineageStatsCache.has(p.id)) lineageStatsCache.set(p.id, getLineageStats(p, inventoryMap));
            return lineageStatsCache.get(p.id)!;
        };

        // 2. Filters
        const searchFiltered = viewFiltered.filter(parent => {
            const uma = umaMapById.get(parent.umaId);
            const displayName = uma ? getUmaDisplayName(uma) : parent.name;
            
            if (filters.searchTerm && !displayName.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
            
            const lineageStats = getCachedLineageStats(parent);
            if (filters.minWhiteSparks > 0 && lineageStats.whiteSkillCount < filters.minWhiteSparks) return false;

            const scope = filters.searchScope;

            // Blue Sparks
            if (!filters.blueSparkGroups.every(group => group.some(f => (scope === 'total' ? (lineageStats.blue[f.type] || 0) : parent.blueSpark.type === f.type ? parent.blueSpark.stars : 0) >= f.stars))) return false;
            // Pink Sparks
            if (!filters.pinkSparkGroups.every(group => group.some(f => (scope === 'total' ? (lineageStats.pink[f.type] || 0) : parent.pinkSpark.type === f.type ? parent.pinkSpark.stars : 0) >= f.stars))) return false;
            // Unique Sparks
            if (!filters.uniqueSparkGroups.every(group => group.some(f => !f.name || (scope === 'total' ? (lineageStats.unique[f.name] || 0) : parent.uniqueSparks.find(s => s.name === f.name)?.stars || 0) >= f.stars))) return false;
            // White Sparks
            if (!filters.whiteSparkGroups.every(group => group.some(f => !f.name || (scope === 'total' ? (lineageStats.white[f.name] || 0) : parent.whiteSparks.find(s => s.name === f.name)?.stars || 0) >= f.stars))) return false;
            
            // Lineage Spark Groups
            if (filters.lineageSparkGroups.length > 0) {
                const passesAllGroups = filters.lineageSparkGroups.every(group => {
                    return group.some(filter => {
                        if (!filter.name) return true;
                        const checkMember = (member: Parent | ManualParentData | null): boolean => {
                            if (!member) return true;
                            if ('whiteSparks' in member) {
                                return member.whiteSparks.some(s => s.name === filter.name);
                            }
                            return false;
                        };
                        const gp1 = resolveGrandparent(parent.grandparent1, inventoryMap);
                        const gp2 = resolveGrandparent(parent.grandparent2, inventoryMap);
                        return checkMember(parent) && checkMember(gp1) && checkMember(gp2);
                    });
                });
                if (!passesAllGroups) return false;
            }

            return true;
        });

        // 3. Scoring & Sorting
        // We calculate scores on the fly if a goal exists, otherwise score is 0.
        const scoredItems = searchFiltered.map(p => ({
            ...p,
            calculatedScore: goal ? calculateScore(p, goal, appData.inventory, skillMapByName) : 0,
            calculatedIndividualScore: goal ? Math.round(calculateIndividualScore(p, goal, inventoryMap, skillMapByName)) : 0,
            totalSparks: countTotalLineageWhiteSparks(p, inventoryMap)
        }));

        return scoredItems.sort((a, b) => {
            let comp = 0;
            switch (sortField) {
                case 'name': comp = a.name.localeCompare(b.name); break;
                case 'gen': comp = b.gen - a.gen; break;
                case 'id': comp = b.id - a.id; break;
                case 'sparks': comp = b.totalSparks - a.totalSparks; break;
                case 'individualScore': comp = b.calculatedIndividualScore - a.calculatedIndividualScore; break;
                default: comp = b.calculatedScore - a.calculatedScore; break;
            }
            return sortDirection === 'desc' ? comp : -comp;
        });

    }, [appData.inventory, activeServer, inventoryView, filters, umaMapById, getUmaDisplayName, inventoryMap, goal, skillMapByName, sortField, sortDirection]);


    const { paginatedInventory, totalCount, totalPages } = useMemo(() => {
        const totalPages = Math.ceil(processedInventory.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedInventory = processedInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        return { paginatedInventory, totalCount: processedInventory.length, totalPages };
    }, [processedInventory, currentPage]);


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

    const destServer = activeServer === 'jp' ? 'Global' : 'JP';
    
    const getParentDisplayName = (parent: Parent | null): string => {
        if (!parent) return '';
        const uma = umaMapById.get(parent.umaId);
        return uma ? getUmaDisplayName(uma) : parent.name;
    };
    
    const parentDisplayName = getParentDisplayName(moveConfirmState?.parent || null);
    const modalTitle = isSelectionMode ? t('modals:selectGrandparentTitle') : t('inventory.title');

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="2xl">
                <div className="flex flex-col md:flex-row gap-6 h-[70vh] inventory-modal__layout">
                    {/* Sidebar Controls */}
                    <div className="w-full md:w-1/3 lg:w-1/4 overflow-y-auto border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-700 pr-0 md:pr-4 pb-4 md:pb-0 flex-shrink-0">
                         <InventoryControls 
                            filters={filters} setFilters={setFilters}
                            sortField={sortField} setSortField={setSortField}
                            sortDirection={sortDirection} setSortDirection={setSortDirection}
                            inventoryView={inventoryView} setInventoryView={setInventoryView}
                         />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="inventory-modal__grid">
                                {paginatedInventory.length > 0 ? (
                                    paginatedInventory.map(parent => {
                                        const characterId = umaMapById.get(parent.umaId)?.characterId;
                                        const isDisabled = !!characterId && excludedCharacterIds.has(characterId);
                                        
                                        // Use the locally calculated score if goal exists, otherwise 0 or parent.score
                                        // Note: parent.score is usually 0 unless updated by roster worker, 
                                        // but here we want dynamic scoring based on potentially different active profile
                                        // or just 0 if no profile.
                                        const displayParent = {
                                            ...parent,
                                            score: parent.calculatedScore || 0
                                        };
                                        
                                        return (
                                            <ParentCard 
                                                key={parent.id} 
                                                parent={displayParent} 
                                                displayScore={!!goal}
                                                onEdit={() => handleOpenEditModal(parent)}
                                                onDelete={() => handleDeleteParent(parent)}
                                                onMove={() => handleMoveParent(parent)}
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
                        </div>

                        <div className="inventory-modal__footer mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
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

                            <div className="flex gap-2">
                                {isSelectionMode ? (
                                    <button className="button button--neutral" onClick={onClose}>{t('common:close')}</button>
                                ) : (
                                    <button className="button button--primary" onClick={handleOpenAddModal}>{t('addParentBtn')}</button>
                                )}
                            </div>
                        </div>
                    </div>
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