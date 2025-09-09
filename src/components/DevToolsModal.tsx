import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Modal from './common/Modal';
import DualListBox from './common/DualListBox';
import { useAppContext } from '../context/AppContext';
import './DevToolsModal.css';

type DevTab = 'skills' | 'images';

const DevToolsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const [activeTab, setActiveTab] = useState<DevTab>('skills');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Developer Tools" size="xl">
            <div className="flex border-b border-stone-200 dark:border-stone-700">
                <button
                    className={`px-4 py-2 font-semibold ${activeTab === 'skills' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-stone-500'}`}
                    onClick={() => setActiveTab('skills')}
                >
                    Skill Exclusions
                </button>
                <button
                    className={`px-4 py-2 font-semibold ${activeTab === 'images' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-stone-500'}`}
                    onClick={() => setActiveTab('images')}
                >
                    Uma Image Manager
                </button>
            </div>
            <div className="pt-4">
                {activeTab === 'skills' && <SkillExclusionTool onClose={onClose} />}
                {activeTab === 'images' && <UmaImageManager />}
            </div>
        </Modal>
    );
};

const SkillExclusionTool = ({ onClose }: { onClose: () => void }) => {
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [allSkills, setAllSkills] = useState<{ id: string, name: string }[]>([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        setStatusMessage('');
        setHasChanges(false);
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
        Promise.all([
            fetch(`${baseUrl}/src/data/skill-list-dev.json`).then(res => res.json()),
            fetch(`${baseUrl}/src/data/skill-exclusions.json`).then(res => res.json())
        ]).then(([devSkills, initialExclusions]) => {
            setAllSkills(devSkills.map((s: any) => ({ id: s.id, name: s.name_en })).sort((a: any, b: any) => a.name.localeCompare(b.name)));
            setExcludedIds(new Set(initialExclusions));
        }).catch(err => {
            setStatusMessage('Error: Could not load skill data. ' + err.message);
        }).finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setStatusMessage('Saving...');
        try {
            const response = await fetch('/api/update-exclusions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Array.from(excludedIds)),
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to save.');
            setStatusMessage('Success! Please run `prepare_data.py` and refresh the page to apply changes.');
            setHasChanges(false);
        } catch (error) {
            setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <>
            {isLoading ? (
                <p className="dialog-modal__message">Loading skill data...</p>
            ) : (
                <>
                    <DualListBox allItems={allSkills} initialExcludedIds={excludedIds} onChange={(ids) => { setExcludedIds(ids); setHasChanges(true); }} />
                    {statusMessage && <p className={`mt-4 text-sm ${statusMessage.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>{statusMessage}</p>}
                </>
            )}
            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>Close</button>
                <button className="button button--primary" onClick={handleSave} disabled={!hasChanges || isLoading}>Save Changes</button>
            </div>
        </>
    );
};


const UmaImageManager = () => {
    const { masterUmaList } = useAppContext();
    const [statusMessages, setStatusMessages] = useState<Record<string, string>>({});
    const [selectedFileNames, setSelectedFileNames] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, umaId: string) => {
        const fileName = e.target.files?.[0]?.name;
        setSelectedFileNames(prev => ({ ...prev, [umaId]: fileName || '' }));
    };

    const handleImageUpload = async (umaId: string) => {
        const fileInput = fileInputRefs.current[umaId];
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            setStatusMessages(prev => ({ ...prev, [umaId]: 'No file selected.' }));
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('umaId', umaId);

        setStatusMessages(prev => ({ ...prev, [umaId]: 'Uploading...' }));

        try {
            const response = await fetch('/api/upload-uma-image', { method: 'POST', body: formData });
            if (!response.ok) throw new Error((await response.json()).message || 'Upload failed.');
            const result = await response.json();
            setStatusMessages(prev => ({ ...prev, [umaId]: `Success: ${result.message}` }));
        } catch (error) {
            setStatusMessages(prev => ({ ...prev, [umaId]: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }));
        }
    };

    return (
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            <p className="dev-tools__info-text">Upload an image for each character. Images should be square. After uploading, you must run <code>python scripts/prepare_data.py</code> and then refresh the application to see the changes.</p>
            <table className="w-full text-left table-fixed dev-tools__table">
                <thead>
                    <tr>
                        <th className="w-20">Image</th>
                        <th className="w-48">Name</th>
                        <th>Actions</th>
                        <th className="w-48">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {masterUmaList.map(uma => (
                        <tr key={uma.id} className="border-b border-stone-200 dark:border-stone-700">
                            <td className="p-2 align-middle">
                                {uma.image ? (
                                    <img src={`${import.meta.env.BASE_URL}${uma.image}`} alt={uma.name_en} className="w-12 h-12 object-cover rounded-full" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700" />
                                )}
                            </td>
                            <td className="p-2 font-medium align-middle break-words">{uma.name_en}</td>
                            <td className="p-2 align-middle">
                                <div className="flex items-center gap-2">
                                    <label className="button button--neutral button--small cursor-pointer whitespace-nowrap">
                                        <span>Choose File</span>
                                        <input 
                                            type="file" 
                                            className="visually-hidden"
                                            ref={el => { fileInputRefs.current[uma.id] = el; }}
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={(e) => handleFileSelect(e, uma.id)}
                                        />
                                    </label>
                                    <span className="text-xs text-stone-500 truncate flex-grow min-w-0" title={selectedFileNames[uma.id]}>
                                        {selectedFileNames[uma.id] || 'No file selected.'}
                                    </span>
                                    <button 
                                        className="button button--secondary button--small flex-shrink-0" 
                                        onClick={() => handleImageUpload(uma.id)}
                                    >
                                        Upload
                                    </button>
                                </div>
                            </td>
                            <td className="p-2 text-xs text-stone-500 align-middle truncate">{statusMessages[uma.id]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DevToolsModal;