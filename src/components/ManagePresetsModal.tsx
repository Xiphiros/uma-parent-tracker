import { useState } from 'react';
import { SkillPreset } from '../types';
import Modal from './common/Modal';
import { useAppContext } from '../context/AppContext';
import EditPresetModal from './EditPresetModal';
import './ManagePresetsModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons';

interface ManagePresetsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ManagePresetsModal = ({ isOpen, onClose }: ManagePresetsModalProps) => {
    const { appData, addSkillPreset, updateSkillPreset, deleteSkillPreset } = useAppContext();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [presetToEdit, setPresetToEdit] = useState<SkillPreset | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [presetToDelete, setPresetToDelete] = useState<SkillPreset | null>(null);

    const handleOpenAdd = () => {
        setPresetToEdit(null);
        setIsEditModalOpen(true);
    };

    const handleOpenEdit = (preset: SkillPreset) => {
        setPresetToEdit(preset);
        setIsEditModalOpen(true);
    };
    
    const handleSavePreset = (id: string | null, name: string, skillIds: number[]) => {
        if (id) {
            updateSkillPreset(id, name, skillIds);
        } else {
            addSkillPreset(name, skillIds);
        }
    };

    const handleDeleteClick = (preset: SkillPreset) => {
        setPresetToDelete(preset);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (presetToDelete) {
            deleteSkillPreset(presetToDelete.id);
        }
        setIsDeleteConfirmOpen(false);
        setPresetToDelete(null);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Manage Skill Presets" size="lg">
                <div className="manage-presets__list">
                    {appData.skillPresets.map(preset => (
                        <div key={preset.id} className="manage-presets__item">
                            <div className="manage-presets__item-info">
                                <span className="manage-presets__item-name">{preset.name}</span>
                                <span className="manage-presets__item-count">({preset.skillIds.length} skills)</span>
                            </div>
                            <div className="manage-presets__item-actions">
                                <button className="button button--secondary button--small" onClick={() => handleOpenEdit(preset)}>
                                    <FontAwesomeIcon icon={faPenToSquare} className="mr-1" /> Edit
                                </button>
                                <button className="button button--danger button--small" onClick={() => handleDeleteClick(preset)}>
                                    <FontAwesomeIcon icon={faTrashCan} className="mr-1" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {appData.skillPresets.length === 0 && (
                        <p className="card__placeholder-text text-center py-4">No presets created yet.</p>
                    )}
                </div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={onClose}>Close</button>
                    <button className="button button--primary" onClick={handleOpenAdd}>Add New Preset</button>
                </div>
            </Modal>

            <EditPresetModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSavePreset}
                presetToEdit={presetToEdit}
            />

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="Confirm Preset Deletion"
            >
                <p className="dialog-modal__message">
                    Are you sure you want to delete the preset "{presetToDelete?.name}"? This action cannot be undone.
                </p>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
                    <button className="button button--danger" onClick={handleConfirmDelete}>Delete</button>
                </div>
            </Modal>
        </>
    );
};

export default ManagePresetsModal;