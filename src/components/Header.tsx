import { useState, useRef, ChangeEvent } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';

const Header = () => {
    const [theme, toggleTheme] = useTheme();
    const { exportData, importData } = useAppContext();
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToImport(file);
            setImportModalOpen(true);
        }
    };

    const handleImportConfirm = async () => {
        if (fileToImport) {
            try {
                await importData(fileToImport);
            } catch (e) {
                alert(`Error importing file: ${e instanceof Error ? e.message : 'Unknown error'}`);
            } finally {
                setImportModalOpen(false);
                setFileToImport(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleImportCancel = () => {
        setImportModalOpen(false);
        setFileToImport(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <header className="header mb-8 text-center">
                <h1 className="header__title text-4xl font-bold">Umamusume Parent Tracker</h1>
                <p className="header__subtitle mt-2">A point-based system for progressive parent farming.</p>
                <div className="header__actions">
                    <label htmlFor="import-file" className="button button--secondary">Import Data</label>
                    <input
                        type="file"
                        id="import-file"
                        ref={fileInputRef}
                        className="visually-hidden"
                        accept="application/json"
                        onChange={handleFileChange}
                    />
                    <button id="export-btn" className="button button--neutral" onClick={exportData}>Export Data</button>
                    <button id="theme-toggle-btn" className="theme-toggle" title="Toggle theme" onClick={toggleTheme}>
                        {theme === 'light' ? (
                            <svg className="icon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.455 2.104a.75.75 0 00-.965.572A9.003 9.003 0 002.5 12.162a9.003 9.003 0 008.59 8.592.75.75 0 00.572-.965A5.25 5.25 0 017.455 2.104z" /></svg>
                        ) : (
                            <svg className="icon sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 4.343a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM5.404 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM17.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM14.596 5.404a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM6.464 13.536a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                </div>
            </header>

            <Modal
                isOpen={isImportModalOpen}
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
        </>
    );
};

export default Header;