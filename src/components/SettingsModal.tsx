import { useState, useRef, ChangeEvent } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import './SettingsModal.css';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { t, i18n } = useTranslation(['settings', 'common']);
    const { exportData, importData, deleteAllData, dataMode, setDataMode, dataDisplayLanguage, setDataDisplayLanguage, changeUiLanguage } = useAppContext();
    
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
                const message = e instanceof Error ? e.message : 'Unknown error';
                setErrorMessage(t('importErrorMsg', { message }));
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
            <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
                <div className="space-y-4 my-4">
                    <div className="form__section !border-t-0 !pt-0">
                        <h4 className="form__section-title mb-2">{t('dataSourceTitle')}</h4>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">{t('dataSourceDesc')}</p>
                        <div className="space-y-2">
                            <label className={`settings-modal__option ${dataMode === 'jp' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="jp" checked={dataMode === 'jp'} onChange={() => setDataMode('jp')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">{t('jpDataLabel')}</span>
                                    <p className="settings-modal__option-description">{t('jpDataDesc')}</p>
                                </div>
                            </label>
                             <label className={`settings-modal__option ${dataMode === 'global' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="global" checked={dataMode === 'global'} onChange={() => setDataMode('global')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">{t('globalDataLabel')}</span>
                                    <p className="settings-modal__option-description">{t('globalDataDesc')}</p>
                                </div>
                            </label>
                        </div>
                    </div>

                     <div className="form__section">
                        <h4 className="form__section-title mb-2">{t('dataDisplayLangTitle')}</h4>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">{t('dataDisplayLangDesc')}</p>
                        <div className="space-y-2">
                            <label className={`settings-modal__option ${dataDisplayLanguage === 'en' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="en" checked={dataDisplayLanguage === 'en'} onChange={() => setDataDisplayLanguage('en')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">{t('enDisplayLabel')}</span>
                                    <p className="settings-modal__option-description">{t('enDisplayDesc')}</p>
                                </div>
                            </label>
                             <label className={`settings-modal__option ${dataDisplayLanguage === 'jp' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="jp" checked={dataDisplayLanguage === 'jp'} onChange={() => setDataDisplayLanguage('jp')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">{t('jpDisplayLabel')}</span>
                                    <p className="settings-modal__option-description">{t('jpDisplayDesc')}</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title mb-2">{t('uiLangTitle')}</h4>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">{t('uiLangDesc')}</p>
                        <div className="space-y-2">
                            <label className={`settings-modal__option ${i18n.language === 'en' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="en" checked={i18n.language === 'en'} onChange={() => changeUiLanguage('en')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">{t('enDisplayLabel')}</span>
                                    <p className="settings-modal__option-description">Change the application's menus and labels to English.</p>
                                </div>
                            </label>
                             <label className={`settings-modal__option ${i18n.language === 'jp' ? 'settings-modal__option--selected' : ''}`}>
                                <input type="radio" value="jp" checked={i18n.language === 'jp'} onChange={() => changeUiLanguage('jp')} className="settings-modal__option-radio" />
                                <div>
                                    <span className="settings-modal__option-label">{t('jpDisplayLabel')}</span>
                                    <p className="settings-modal__option-description">アプリケーションのメニューやラベルを日本語に変更します。</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form__section">
                        <h4 className="form__section-title mb-2">{t('manageDataTitle')}</h4>
                         <button id="export-btn" className="button button--secondary w-full" onClick={exportData}>
                            {t('exportBtn')}
                        </button>
                        
                        <label htmlFor="import-file" className="button button--neutral w-full mt-2">
                            {t('importBtn')}
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
                            {t('deleteAllBtn')}
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal
                isOpen={isImportConfirmOpen}
                onClose={handleImportCancel}
                title={t('importConfirmTitle')}
            >
                <p className="dialog-modal__message" dangerouslySetInnerHTML={{ __html: t('importConfirmMsg') }} />
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={handleImportCancel}>{t('common:cancel')}</button>
                    <button className="button button--primary" onClick={handleImportConfirm}>{t('common:confirm')}</button>
                </div>
            </Modal>
            
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title={t('deleteConfirmTitle')}
            >
                <p className="dialog-modal__message" dangerouslySetInnerHTML={{ __html: t('deleteConfirmMsg') }} />
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setDeleteConfirmOpen(false)}>{t('common:cancel')}</button>
                    <button className="button button--danger" onClick={handleDeleteConfirm}>{t('deleteConfirmBtn')}</button>
                </div>
            </Modal>

            <Modal
                isOpen={!!errorMessage}
                onClose={() => setErrorMessage('')}
                title={t('importErrorTitle')}
            >
                <p className="dialog-modal__message">{errorMessage}</p>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={() => setErrorMessage('')}>{t('common:ok')}</button>
                </div>
            </Modal>
        </>
    );
};

export default SettingsModal;