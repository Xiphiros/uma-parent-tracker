import { Folder, Profile } from "../types";
import { getIcon } from "./icons";
import './FolderTab.css';

interface FolderTabProps {
    folder: Folder;
    profilesInFolder: Profile[];
    isActive: boolean;
    isDragOver: boolean;
    onToggleCollapse: (folderId: string) => void;
    onSettings: (folder: Folder) => void;
}

const FolderTab = ({ folder, profilesInFolder, isActive, isDragOver, onToggleCollapse, onSettings }: FolderTabProps) => {
    const Icon = getIcon(folder.icon);

    const folderClasses = [
        'folder-tab',
        isActive ? 'folder-tab--active' : '',
        folder.isCollapsed ? 'folder-tab--collapsed' : '',
        isDragOver ? 'folder-tab--drag-over' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={folderClasses}>
            <div
                className="folder-tab__button"
                style={{ color: folder.color }}
            >
                <Icon />
                {folder.name}
                <span className="text-xs opacity-60 ml-1">({profilesInFolder.length})</span>
                <div className="tab__actions">
                    <button className="tab__settings-btn" title="Folder Settings" onClick={(e) => { e.stopPropagation(); onSettings(folder); }}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
                <button
                    className="folder-tab__collapse-btn"
                    onClick={(e) => { e.stopPropagation(); onToggleCollapse(folder.id); }}
                    title={folder.isCollapsed ? 'Expand Folder' : 'Collapse Folder'}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default FolderTab;