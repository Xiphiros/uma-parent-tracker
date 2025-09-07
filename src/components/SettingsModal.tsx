import { useState, useRef, ChangeEvent } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { exportData, importData, deleteAllData } = useAppContext();
    
    const [isImportConfirmOpen, setImportConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToImport(file);
            setImportConfirmOpen(true);
        }
    };

    const handleImportConfirm = async () => {
        if (fileToImport) {
            try {
                await importData(fileToImport);
                onClose(); // Close main settings modal on success
            } catch (e) {
                setErrorMessage(`Error importing file: ${e instanceof Error ? e.message : 'Unknown error'}`);
            } finally {
                setImportConfirmOpen(false);
                setFileToImport(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleImportCancel = () => {
        setImportConfirmOpen(false);
        setFileToImport(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const handleDeleteConfirm = () => {
        deleteAllData();
        setDeleteConfirmOpen(false);
        onClose();
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Settings & Data Management">
                <div className="space-y-4 my-4">
                     <button id="export-btn" className="button button--secondary w-full" onClick={exportData}>
                        Export All Data
                    </button>
                    
                    <label htmlFor="import-file" className="button button--neutral w-full">
                        Import Data
                    </label>
                    <input
                        type="file"
                        id="import-file"
                        ref={fileInputRef}
                        className="visually-hidden"
                        accept="application/json"
                        onChange={handleFileChange}
                    />
                    
                    <div className="border-t pt-4">
                        <button className="button button--danger w-full" onClick={() => setDeleteConfirmOpen(true)}>
                            Delete All Data
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal
                isOpen={isImportConfirmOpen}
                onClose={handleImportCancel}
                title="Confirm Import"
            >
                <p className="dialog-modal__message">
                    Are you sure you want to import this file?
                    <br />
                    <strong>This will overwrite all current projects and data.</strong>
                </p>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={handleImportCancel}>Cancel</button>
                    <button className="button button--primary" onClick={handleImportConfirm}>Confirm</button>
                </div>
            </Modal>
            
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Confirm Deletion"
            >
                <p className="dialog-modal__message">
                    Are you sure you want to delete all data?
                    <br />
                    <strong>This action is irreversible.</strong>
                    <br /><br />
                    It is highly recommended to export your data first as a backup.
                </p>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
                    <button className="button button--danger" onClick={handleDeleteConfirm}>Delete Everything</button>
                </div>
            </Modal>

            <Modal
                isOpen={!!errorMessage}
                onClose={() => setErrorMessage('')}
                title="Import Error"
            >
                <p className="dialog-modal__message">{errorMessage}</p>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={() => setErrorMessage('')}>OK</button>
                </div>
            </Modal>
        </>
    );
};

export default SettingsModal;