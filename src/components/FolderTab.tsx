import React from 'react';
import { Folder, Profile } from "../types";
import { getIcon } from "./icons";
import './FolderTab.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faChevronDown, faBookmark, faThumbtack } from '@fortawesome/free-solid-svg-icons';

interface FolderTabProps {
    folder: Folder;
    profilesInFolder: Profile[];
    isActive: boolean;
    isDragOver: boolean;
    onToggleCollapse: (folderId: string) => void;
    onSettings: (folder: Folder) => void;
    onTogglePin: (folderId: string) => void;
}

const FolderTab: React.FC<FolderTabProps> = ({ folder, profilesInFolder, isActive, isDragOver, onToggleCollapse, onSettings, onTogglePin }) => {
    const Icon = getIcon(folder.icon);

    const folderClasses = [
        'folder-tab',
        isActive ? 'folder-tab--active' : '',
        folder.isCollapsed ? 'folder-tab--collapsed' : '',
        isDragOver ? 'folder-tab--drag-over' : ''
    ].filter(Boolean).join(' ');

    const buttonStyle: React.CSSProperties = {
        color: folder.color,
    };
    if (isActive) {
        buttonStyle.borderBottomColor = folder.color;
    }

    return (
        <div className={folderClasses}>
            <div
                className="folder-tab__button"
                style={buttonStyle}
            >
                {folder.isPinned && <FontAwesomeIcon icon={faBookmark} className="text-amber-500 mr-1" />}
                <Icon />
                {folder.name}
                <span className="text-xs opacity-60 ml-1">({profilesInFolder.length})</span>
                <div className="tab__actions">
                    <button className={`tab__pin-btn ${folder.isPinned ? 'tab__pin-btn--pinned' : ''}`} title={folder.isPinned ? 'Unpin Folder' : 'Pin Folder'} onClick={(e) => { e.stopPropagation(); onTogglePin(folder.id); }}>
                        <FontAwesomeIcon icon={folder.isPinned ? faBookmark : faThumbtack} className="h-4 w-4" />
                    </button>
                    <button className="tab__settings-btn" title="Folder Settings" onClick={(e) => { e.stopPropagation(); onSettings(folder); }}>
                        <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
                    </button>
                </div>
                <button
                    className="folder-tab__collapse-btn"
                    onClick={(e) => { e.stopPropagation(); onToggleCollapse(folder.id); }}
                    title={folder.isCollapsed ? 'Expand Folder' : 'Collapse Folder'}
                >
                    <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

export default FolderTab;