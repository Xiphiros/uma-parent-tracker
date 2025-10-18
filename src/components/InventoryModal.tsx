import { useState, useMemo, useEffect } from 'react';
import { Parent, ValidationResult } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import AddParentModal from './AddParentModal';
import { useAppContext } from '../context/AppContext';
import './InventoryModal.css';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

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
        sortedParentIds, filters, sortField, sortDirection, inventoryView
    } = useAppContext();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [parentToEdit, setParentToEdit] = useState<Parent | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [parentToDelete, setParentToDelete] = useState<Parent | null>(null);
    const [moveConfirmState, setMoveConfirmState] = useState<MoveConfirmState | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    // Reset to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortField, sortDirection, inventoryView]);

    const { paginatedInventory, totalCount, totalPages } = useMemo(() => {
        const parentObjects = sortedParentIds.map(id => inventoryMap.get(id)).filter((p): p is Parent => !!p);
        const totalPages = Math.ceil(parentObjects.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedInventory = parentObjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        return { paginatedInventory, totalCount: parentObjects.length, totalPages };
    }, [sortedParentIds, inventoryMap, currentPage]);


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

    const destServer = appData.activeServer === 'jp' ? 'Global' : 'JP';
    
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
                <div className="inventory-modal__main-content">
                    <div className="inventory-modal__grid">
                        {paginatedInventory.length > 0 ? (
                            paginatedInventory.map(parent => {
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
                <div className="inventory-modal__footer">
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