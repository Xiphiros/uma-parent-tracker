import React from 'react';
import { Folder, Profile } from "../types";
import { getIcon } from "./icons";
import './FolderTab.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface FolderTabProps {
    folder: Folder;
    profilesInFolder: Profile[];
    isActive: boolean;
    isDragOver: boolean;
    onToggleCollapse: (folderId: string) => void;
    onSettings: (folder: Folder) => void;
}

const FolderTab: React.FC<FolderTabProps> = ({ folder, profilesInFolder, isActive, isDragOver, onToggleCollapse, onSettings }) => {
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
                <Icon />
                {folder.name}
                <span className="text-xs opacity-60 ml-1">({profilesInFolder.length})</span>
                <div className="tab__actions">
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