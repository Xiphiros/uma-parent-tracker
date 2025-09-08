import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './common/Modal';
import { Profile, Folder, IconName } from '../types';
import './Tabs.css';
import FolderTab from './FolderTab';
import AddFolderModal from './AddFolderModal';
import ContextMenu, { MenuItem } from './common/ContextMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark, faGear, faChevronLeft, faChevronRight, faFolderPlus, faPlus, faThumbtack } from '@fortawesome/free-solid-svg-icons';

interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    items: MenuItem[];
}

const Tabs = () => {
    const { appData, switchProfile, addProfile, renameProfile, deleteProfile, togglePinProfile, reorderLayout, reorderProfileInFolder, moveProfileToFolder, addFolder, updateFolder, deleteFolder, toggleFolderCollapse } = useAppContext();
    const { profiles, folders, layout, activeProfileId } = appData;

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('New Project');
    
    const [settingsModalProfile, setSettingsModalProfile] = useState<Profile | null>(null);
    const [isRenameModalOpen, setRenameModalOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const [isFolderModalOpen, setFolderModalOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [isDeleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false);
    const [isFolderSettingsOpen, setFolderSettingsOpen] = useState(false);

    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, items: [] });
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    const tabListRef = useRef<HTMLUListElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const profilesById = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);
    const foldersById = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);

    // --- Context Menu ---
    const handleOpenContextMenu = (e: React.MouseEvent, item: Profile | Folder) => {
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling to parent folder handlers
        
        let menuItems: MenuItem[] = [];
        if ('profileIds' in item) { // It's a Folder
            menuItems = [
                { label: 'Edit Folder', onClick: () => handleOpenFolderSettings(item) },
                { label: 'Delete Folder...', onClick: () => handleDeleteFolder(), isDestructive: true },
            ];
            setFolderToEdit(item); // Set context for deletion
        } else { // It's a Profile
            menuItems = [
                { label: 'Rename Project', onClick: () => { setSettingsModalProfile(item); setRenameValue(item.name); setRenameModalOpen(true); } },
                { label: item.isPinned ? 'Unpin Project' : 'Pin Project', onClick: () => togglePinProfile(item.id) },
                { label: 'Delete Project...', onClick: () => { setSettingsModalProfile(item); handleDelete(); }, isDestructive: true },
            ];
        }

        setContextMenu({ isOpen: true, x: e.pageX, y: e.pageY, items: menuItems });
    };

    // --- Overflow Navigation ---
    const checkScrollState = () => {
        const el = tabListRef.current;
        if (el) {
            const buffer = 1; 
            setCanScrollLeft(el.scrollLeft > buffer);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - buffer);
        }
    };

    useEffect(() => {
        const tabList = tabListRef.current;
        if (!tabList) return;

        checkScrollState();
        const resizeObserver = new ResizeObserver(checkScrollState);
        resizeObserver.observe(tabList);
        tabList.addEventListener('scroll', checkScrollState, { passive: true });

        return () => {
            resizeObserver.disconnect();
            tabList.removeEventListener('scroll', checkScrollState);
        };
    }, [profiles, layout, folders]);

    const handleScroll = (event: React.MouseEvent, direction: 'left' | 'right') => {
        const el = tabListRef.current;
        if (el) {
            if (event.shiftKey) {
                const scrollPos = direction === 'left' ? 0 : el.scrollWidth - el.clientWidth;
                el.scrollTo({ left: scrollPos, behavior: 'smooth' });
                return;
            }

            const scrollAmount = el.clientWidth * 0.5;

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
    const dragItem = useRef<{ id: string | number, type: 'folder' | 'profile', parentId: string | null } | null>(null);

    const getDragTargetInfo = (element: HTMLElement) => {
        const li = element.closest<HTMLElement>('.tab, .folder-group');
        if (!li) return null;
        return {
            id: li.dataset.id!,
            type: li.dataset.type as 'folder' | 'profile',
            parentId: li.dataset.parentId || null
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
        const info = getDragTargetInfo(e.currentTarget);
        if (info) {
            dragItem.current = {
                id: info.type === 'folder' ? info.id : Number(info.id),
                type: info.type,
                parentId: info.parentId,
            };
            e.currentTarget.classList.add('tab--dragging');
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        const info = getDragTargetInfo(e.currentTarget);
        if (info?.type === 'folder' && dragItem.current?.type === 'profile') {
            setDragOverFolderId(info.id);
        }
        e.currentTarget.classList.add('tab--drag-over');
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        const info = getDragTargetInfo(e.currentTarget);
        if (info?.id === dragOverFolderId) {
            setDragOverFolderId(null);
        }
        e.currentTarget.classList.remove('tab--drag-over');
    };

    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        setDragOverFolderId(null);
        e.currentTarget.classList.remove('tab--drag-over');
        
        const sourceInfo = dragItem.current;
        const destInfo = getDragTargetInfo(e.currentTarget);

        // Exit if no valid source/destination, or if dropping on itself
        if (!sourceInfo || !destInfo || sourceInfo.id == destInfo.id) {
            dragItem.current = null;
            return;
        }

        // Case 1: Dropping a profile onto a folder tab to move it inside.
        if (sourceInfo.type === 'profile' && destInfo.type === 'folder' && sourceInfo.parentId !== destInfo.id) {
            moveProfileToFolder(sourceInfo.id as number, destInfo.id, -1); // Append to end of folder
            dragItem.current = null;
            return;
        }

        // For all reordering cases, determine the correctly typed destination ID
        const destId = destInfo.type === 'profile' ? Number(destInfo.id) : destInfo.id;

        // Case 2: Reordering items within the same context (either top-level or same folder)
        if (sourceInfo.parentId === destInfo.parentId) {
            if (sourceInfo.parentId) { // Reordering inside a folder
                const folder = foldersById.get(sourceInfo.parentId);
                if (folder) {
                    const sourceIndex = folder.profileIds.indexOf(sourceInfo.id as number);
                    const destIndex = folder.profileIds.indexOf(destId as number);
                    if (sourceIndex > -1 && destIndex > -1) {
                        reorderProfileInFolder(folder.id, sourceIndex, destIndex);
                    }
                }
            } else { // Reordering in top-level layout
                const sourceIndex = layout.indexOf(sourceInfo.id);
                const destIndex = layout.indexOf(destId);
                if (sourceIndex > -1 && destIndex > -1) {
                    reorderLayout(sourceIndex, destIndex);
                }
            }
        }
        // Case 3: Moving a profile between different contexts (e.g., folder to layout, layout to folder, folder to folder)
        else if (sourceInfo.type === 'profile') {
            const destFolder = destInfo.parentId ? foldersById.get(destInfo.parentId) : null;
            const destIndex = destFolder
                ? destFolder.profileIds.indexOf(destId as number)
                : layout.indexOf(destId);
            
            moveProfileToFolder(sourceInfo.id as number, destInfo.parentId, destIndex);
        }

        dragItem.current = null;
    };
    
    const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
        e.currentTarget.classList.remove('tab--dragging');
        setDragOverFolderId(null);
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

    const handleFolderSave = (name: string, color: string, icon: IconName) => {
        if (folderToEdit) {
            updateFolder(folderToEdit.id, { name, color, icon });
        } else {
            addFolder(name, color, icon);
        }
    };
    
    const handleOpenFolderSettings = (folder: Folder) => {
        setFolderToEdit(folder);
        setFolderSettingsOpen(true);
    };

    const handleDeleteFolder = () => {
        if (folderToEdit) {
            setFolderToDelete(folderToEdit);
            setDeleteFolderConfirmOpen(true);
            setFolderSettingsOpen(false);
        }
    };

    const handleConfirmDeleteFolder = (deleteContained: boolean) => {
        if (folderToDelete) {
            deleteFolder(folderToDelete.id, deleteContained);
            setFolderToDelete(null);
            setDeleteFolderConfirmOpen(false);
        }
    };

    // --- Render Logic ---
    const renderLayout = () => {
        return layout.map(itemId => {
            if (typeof itemId === 'string' && foldersById.has(itemId)) {
                // It's a folder
                const folder = foldersById.get(itemId)!;
                const profilesInFolder = folder.profileIds.map(pid => profilesById.get(pid)).filter(Boolean) as Profile[];
                const isFolderActive = profilesInFolder.some(p => p.id === activeProfileId);
                const folderGroupStyle = { '--folder-color': folder.color } as React.CSSProperties;

                return (
                    <li key={folder.id} className="folder-group" draggable="true"
                        data-id={folder.id} data-type="folder"
                        style={folderGroupStyle}
                        onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                        onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onDragEnd={handleDragEnd}
                        onContextMenu={(e) => handleOpenContextMenu(e, folder)}>
                        
                        <FolderTab folder={folder} profilesInFolder={profilesInFolder} isActive={isFolderActive} isDragOver={dragOverFolderId === folder.id} onToggleCollapse={toggleFolderCollapse} onSettings={handleOpenFolderSettings} />
                        
                        {!folder.isCollapsed && profilesInFolder.length > 0 && (
                            <ul>
                                {profilesInFolder.map(profile => renderProfileTab(profile, true, folder.id))}
                            </ul>
                        )}
                    </li>
                );

            } else if (typeof itemId === 'number' && profilesById.has(itemId)) {
                // It's a top-level profile
                const profile = profilesById.get(itemId)!;
                return renderProfileTab(profile, false, null);
            }
            return null;
        });
    };
    
    const renderProfileTab = (profile: Profile, inFolder: boolean, parentId: string | null) => (
        <li key={profile.id} 
            className={`tab ${profile.id === activeProfileId ? 'tab--active' : ''} ${inFolder ? 'tab--in-folder' : ''}`}
            draggable="true"
            data-id={profile.id} data-type="profile" data-parent-id={parentId || ''}
            onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onDragEnd={handleDragEnd}
            onContextMenu={(e) => handleOpenContextMenu(e, profile)}
        >
            <button className="tab__button" onClick={() => switchProfile(profile.id)}>
                {profile.isPinned && <FontAwesomeIcon icon={faBookmark} className="h-4 w-4 text-amber-500" />}
                {profile.name}
            </button>
            <div className="tab__actions">
                    <button className={`tab__pin-btn ${profile.isPinned ? 'tab__pin-btn--pinned' : ''}`} title={profile.isPinned ? 'Unpin Project' : 'Pin Project'} onClick={() => togglePinProfile(profile.id)}>
                        <FontAwesomeIcon icon={profile.isPinned ? faBookmark : faThumbtack} className="h-4 w-4" />
                </button>
                <button className="tab__settings-btn" title="Project Settings" onClick={() => openSettings(profile)}>
                    <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
                </button>
            </div>
        </li>
    );

    return (
        <>
            <nav className="tabs__container">
                <button 
                    className="tabs__nav-btn" 
                    onClick={(e) => handleScroll(e, 'left')} 
                    disabled={!canScrollLeft}
                    title="Scroll Left (Hold Shift for Start)"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5" />
                </button>
                <div className="tabs__list-wrapper">
                    <ul className="tabs__list" ref={tabListRef}>
                       {renderLayout()}
                    </ul>
                </div>
                <button 
                    className="tabs__nav-btn" 
                    onClick={(e) => handleScroll(e, 'right')} 
                    disabled={!canScrollRight}
                    title="Scroll Right (Hold Shift for End)"
                >
                    <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5" />
                </button>
                <div className="tabs__actions-group">
                    <button className="tabs__add-btn" title="Add New Folder" onClick={() => { setFolderToEdit(null); setFolderModalOpen(true); }}>
                        <FontAwesomeIcon icon={faFolderPlus} className="h-6 w-6" />
                    </button>
                    <button className="tabs__add-btn" title="Add New Project" onClick={() => setAddModalOpen(true)}>
                        <FontAwesomeIcon icon={faPlus} className="h-6 w-6" />
                    </button>
                </div>
            </nav>

            <ContextMenu 
                isOpen={contextMenu.isOpen}
                position={{ x: contextMenu.x, y: contextMenu.y }}
                items={contextMenu.items}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Modals */}
            <AddFolderModal isOpen={isFolderModalOpen} onClose={() => setFolderModalOpen(false)} onSave={handleFolderSave} folderToEdit={folderToEdit} />

            <Modal isOpen={isFolderSettingsOpen} onClose={() => setFolderSettingsOpen(false)} title={`Settings for "${folderToEdit?.name}"`}>
                 <div className="dialog-modal__message">What would you like to do?</div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setFolderSettingsOpen(false)}>Cancel</button>
                    <button className="button button--secondary" onClick={() => { setFolderSettingsOpen(false); setFolderModalOpen(true); }}>Edit</button>
                    <button className="button button--danger" onClick={handleDeleteFolder}>Delete</button>
                </div>
            </Modal>

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

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Project Deletion">
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
            
             <Modal isOpen={isDeleteFolderConfirmOpen} onClose={() => setDeleteFolderConfirmOpen(false)} title={`Delete Folder "${folderToDelete?.name}"?`}>
                <div className="dialog-modal__message">
                    <p>What should be done with the projects inside this folder?</p>
                </div>
                <div className="dialog-modal__footer">
                    <button className="button button--neutral" onClick={() => setDeleteFolderConfirmOpen(false)}>Cancel</button>
                    <button className="button button--secondary" onClick={() => handleConfirmDeleteFolder(false)}>Move Projects to Top Level</button>
                    <button className="button button--danger" onClick={() => handleConfirmDeleteFolder(true)}>Delete Folder and All Projects Inside</button>
                </div>
            </Modal>

            <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage('')} title="Action Not Allowed">
                <p className="dialog-modal__message">{alertMessage}</p>
                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={() => setAlertMessage('')}>OK</button>
                </div>
            </Modal>
        </>
    );
};

export default Tabs;