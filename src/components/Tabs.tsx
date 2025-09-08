import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import { Profile } from '../types';
import './Tabs.css';

const Tabs = () => {
    const { appData, switchProfile, addProfile, renameProfile, deleteProfile, togglePinProfile, reorderProfiles } = useAppContext();
    const { profiles, activeProfileId } = appData;

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('New Project');
    
    const [settingsModalProfile, setSettingsModalProfile] = useState<Profile | null>(null);
    const [isRenameModalOpen, setRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const tabListRef = useRef<HTMLUListElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const sortedProfiles = useMemo(() => {
        const pinned = profiles.filter(p => p.isPinned);
        const unpinned = profiles.filter(p => !p.isPinned);
        return [...pinned, ...unpinned];
    }, [profiles]);

    // --- Overflow Navigation ---
    const checkScrollability = () => {
        const el = tabListRef.current;
        if (el) {
            // Use a small buffer to account for floating point inaccuracies
            const buffer = 1; 
            setCanScrollLeft(el.scrollLeft > buffer);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - buffer);
        }
    };

    useEffect(() => {
        const tabList = tabListRef.current;
        if (!tabList) return;

        checkScrollability();
        const resizeObserver = new ResizeObserver(checkScrollability);
        resizeObserver.observe(tabList);
        tabList.addEventListener('scroll', checkScrollability);

        return () => {
            resizeObserver.disconnect();
            tabList.removeEventListener('scroll', checkScrollability);
        };
    }, [sortedProfiles]); // Re-check when profiles change

    const handleScroll = (direction: 'left' | 'right', event: React.MouseEvent) => {
        const el = tabListRef.current;
        if (el) {
            if (event.shiftKey) {
                const scrollPos = direction === 'left' ? 0 : el.scrollWidth - el.clientWidth;
                el.scrollTo({ left: scrollPos, behavior: 'smooth' });
                return;
            }

            const scrollAmount = el.clientWidth * 0.8;

            if (direction === 'right') {
                const remainingScroll = el.scrollWidth - el.clientWidth - el.scrollLeft;
                if (remainingScroll <= scrollAmount + 1) {
                    el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'smooth' });
                } else {
                    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            } else { // direction === 'left'
                if (el.scrollLeft <= scrollAmount + 1) {
                    el.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                }
            }
        }
    };

    // --- Drag and Drop ---
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        dragItem.current = index;
        e.currentTarget.classList.add('tab--dragging');
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        const draggedItem = sortedProfiles[dragItem.current!];
        const targetItem = sortedProfiles[index];

        // Prevent dropping across pinned/unpinned boundary
        if (draggedItem.isPinned !== targetItem.isPinned) {
            e.preventDefault();
            return;
        }

        dragOverItem.current = index;
        e.currentTarget.classList.add('tab--drag-over');
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
        e.currentTarget.classList.remove('tab--drag-over');
    };

    const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
        e.currentTarget.classList.remove('tab--drag-over');
        if (dragItem.current === null || dragOverItem.current === null) return;
        
        const sourceProfile = sortedProfiles[dragItem.current];
        const destinationProfile = sortedProfiles[dragOverItem.current];
        
        // Find original indices in the unsorted `profiles` array
        const sourceIndex = profiles.findIndex(p => p.id === sourceProfile.id);
        const destinationIndex = profiles.findIndex(p => p.id === destinationProfile.id);

        if (sourceIndex !== destinationIndex) {
            reorderProfiles(sourceIndex, destinationIndex);
        }

        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
        e.currentTarget.classList.remove('tab--dragging');
    };


    // --- Modals ---
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
            setSettingsModalProfile(null);
            setAlertMessage('You cannot delete the last project.');
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
                 <button 
                    className={`tabs__nav-btn tabs__nav-btn--left ${canScrollLeft ? 'tabs__nav-btn--visible' : ''}`} 
                    onClick={(e) => handleScroll('left', e)} 
                    disabled={!canScrollLeft}
                    title="Scroll Left (Hold Shift for Start)"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="tabs__list-wrapper">
                    <ul className="tabs__list" ref={tabListRef}>
                        {sortedProfiles.map((profile, index) => (
                            <li key={profile.id} 
                                className={`tab ${profile.id === activeProfileId ? 'tab--active' : ''}`}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragLeave={handleDragLeave}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                            >
                                <button className="tab__button" onClick={() => switchProfile(profile.id)}>
                                    {profile.isPinned && <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                                    {profile.name}
                                </button>
                                <div className="tab__actions">
                                     <button className={`tab__pin-btn ${profile.isPinned ? 'tab__pin-btn--pinned' : ''}`} title={profile.isPinned ? 'Unpin Project' : 'Pin Project'} onClick={() => togglePinProfile(profile.id)}>
                                        <svg className="h-4 w-4" fill={profile.isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    </button>
                                    <button className="tab__settings-btn" title="Project Settings" onClick={() => openSettings(profile)}>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                 <button 
                    className={`tabs__nav-btn tabs__nav-btn--right ${canScrollRight ? 'tabs__nav-btn--visible' : ''}`} 
                    onClick={(e) => handleScroll('right', e)} 
                    disabled={!canScrollRight}
                    title="Scroll Right (Hold Shift for End)"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
                <button className="tabs__add-btn" title="Add New Project" onClick={() => setAddModalOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
            </nav>

            {/* Modals */}
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
            
            <Modal isOpen={!!settingsModalProfile} onClose={() => setSettingsModalProfile(null)} title={`Settings for "${settingsModalProfile?.name}"`}>
                <div className="dialog-modal__message">What would you like to do?</div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setSettingsModalProfile(null)}>Cancel</button>
                    <button className="button button--secondary" onClick={() => { setRenameValue(settingsModalProfile?.name || ''); setRenameModalOpen(true); }}>Rename</button>
                    <button className="button button--danger" onClick={handleDelete}>Delete</button>
                </div>
            </Modal>
            
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
            
            <Modal
                isOpen={!!alertMessage}
                onClose={() => setAlertMessage('')}
                title="Action Not Allowed"
            >
                <p className="dialog-modal__message">{alertMessage}</p>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={() => setAlertMessage('')}>OK</button>
                </div>
            </Modal>
        </>
    );
};

export default Tabs;