import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import { Profile } from '../types';
import './Tabs.css';

const Tabs = () => {
    const { appData, switchProfile, addProfile, renameProfile, deleteProfile } = useAppContext();
    const { profiles, activeProfileId } = appData;

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('New Project');
    
    const [settingsModalProfile, setSettingsModalProfile] = useState<Profile | null>(null);
    const [isRenameModalOpen, setRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const handleAddProfile = () => {
        if (newProfileName.trim()) {
            addProfile(newProfileName.trim());
            setNewProfileName('New Project');
            setAddModalOpen(false);
        }
    };

    const openSettings = (profile: Profile) => {
        setSettingsModalProfile(profile);
    };

    const handleRename = () => {
        if (settingsModalProfile && renameValue.trim()) {
            renameProfile(settingsModalProfile.id, renameValue.trim());
            setSettingsModalProfile(null);
            setRenameModalOpen(false);
        }
    };
    
    const handleDelete = () => {
        if (settingsModalProfile && profiles.length > 1) {
            setDeleteConfirmOpen(true);
        } else {
            alert('You cannot delete the last project.');
        }
    };

    const handleConfirmDelete = () => {
        if (settingsModalProfile) {
            deleteProfile(settingsModalProfile.id);
            setSettingsModalProfile(null);
            setDeleteConfirmOpen(false);
        }
    };

    return (
        <>
            <nav className="tabs__container">
                <ul className="tabs__list">
                    {profiles.map(profile => (
                        <li key={profile.id} className={`tab ${profile.id === activeProfileId ? 'tab--active' : ''}`}>
                            <button className="tab__button" onClick={() => switchProfile(profile.id)}>
                                {profile.name}
                            </button>
                            <button className="tab__settings-btn" title="Project Settings" onClick={() => openSettings(profile)}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                        </li>
                    ))}
                </ul>
                <button className="tabs__add-btn" title="Add New Project" onClick={() => setAddModalOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
            </nav>

            {/* Add Profile Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Project">
                <div className="my-4">
                    <label htmlFor="new-profile-name" className="form__label">Project Name</label>
                    <input
                        type="text"
                        id="new-profile-name"
                        className="form__input"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()}
                    />
                </div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setAddModalOpen(false)}>Cancel</button>
                    <button className="button button--primary" onClick={handleAddProfile}>Add Project</button>
                </div>
            </Modal>
            
            {/* Settings Modal */}
            <Modal isOpen={!!settingsModalProfile} onClose={() => setSettingsModalProfile(null)} title={`Settings for "${settingsModalProfile?.name}"`}>
                <div className="dialog-modal__message">What would you like to do?</div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setSettingsModalProfile(null)}>Cancel</button>
                    <button className="button button--secondary" onClick={() => { setRenameValue(settingsModalProfile?.name || ''); setRenameModalOpen(true); }}>Rename</button>
                    <button className="button button--danger" onClick={handleDelete}>Delete</button>
                </div>
            </Modal>
            
             {/* Rename Modal */}
            <Modal isOpen={isRenameModalOpen} onClose={() => setRenameModalOpen(false)} title={`Rename "${settingsModalProfile?.name}"`}>
                <div className="my-4">
                    <label htmlFor="rename-profile-name" className="form__label">New Project Name</label>
                    <input
                        type="text"
                        id="rename-profile-name"
                        className="form__input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    />
                </div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setRenameModalOpen(false)}>Cancel</button>
                    <button className="button button--primary" onClick={handleRename}>Save</button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Confirm Project Deletion"
            >
                <p className="dialog-modal__message">
                    Are you sure you want to delete project "{settingsModalProfile?.name}"?
                    <br />
                    <strong>This cannot be undone.</strong>
                </p>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
                    <button className="button button--danger" onClick={handleConfirmDelete}>Delete Project</button>
                </div>
            </Modal>
        </>
    );
};

export default Tabs;