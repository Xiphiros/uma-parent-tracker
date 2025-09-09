import { useState, useRef, ChangeEvent } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { exportData, importData, deleteAllData, dataMode, setDataMode, displayLanguage, setDisplayLanguage } = useAppContext();
    
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
                    <div className="form__section !border-t-0 !pt-0">
                        <h4 className="form__section-title mb-2">Data Source</h4>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Select which server's dataset to use for skills and characters.</p>
                        <div className="space-y-2">
                            <label className={`settings-modal__option ${dataMode === 'jp' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="jp" checked={dataMode === 'jp'} onChange={() => setDataMode('jp')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">Japanese (All Data)</span>
                                    <p className="settings-modal__option-description">Includes all characters and skills, with Japanese names as fallbacks.</p>
                                </div>
                            </label>
                             <label className={`settings-modal__option ${dataMode === 'global' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="global" checked={dataMode === 'global'} onChange={() => setDataMode('global')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">Global (Translated Only)</span>
                                    <p className="settings-modal__option-description">Only shows characters and skills that have an official English translation.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                     <div className="form__section">
                        <h4 className="form__section-title mb-2">Display Language</h4>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Choose the language for displaying names of Umas and skills.</p>
                        <div className="space-y-2">
                            <label className={`settings-modal__option ${displayLanguage === 'en' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="en" checked={displayLanguage === 'en'} onChange={() => setDisplayLanguage('en')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">English</span>
                                    <p className="settings-modal__option-description">Display names in English, falling back to Japanese if no translation exists.</p>
                                </div>
                            </label>
                             <label className={`settings-modal__option ${displayLanguage === 'jp' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="jp" checked={displayLanguage === 'jp'} onChange={() => setDisplayLanguage('jp')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">Japanese</span>
                                    <p className="settings-modal__option-description">Display all names in Japanese (日本語).</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title mb-2">Manage Data</h4>
                         <button id="export-btn" className="button button--secondary w-full" onClick={exportData}>
                            Export All Data
                        </button>
                        
                        <label htmlFor="import-file" className="button button--neutral w-full mt-2">
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
                    </div>
                    
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