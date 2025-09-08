import { useState, useMemo, useEffect } from 'react';
import Modal from './common/Modal';
import { DualListBox } from './common/DualListBox';
import skillListDev from '../data/skill-list-dev.json';
import initialExclusions from '../data/skill-exclusions.json';

interface DevToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DevToolsModal = ({ isOpen, onClose }: DevToolsModalProps) => {
    const [excludedIds, setExcludedIds] = useState(new Set(initialExclusions));
    const [statusMessage, setStatusMessage] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    const allSkills = useMemo(() =>
        skillListDev.map(s => ({ id: s.id, name: s.name_en })).sort((a,b) => a.name.localeCompare(b.name))
    , []);
    
    useEffect(() => {
        if (isOpen) {
            setStatusMessage('');
            setHasChanges(false);
            // Re-fetch initial state in case it was changed elsewhere
            // The import is static, so for now we reset from the imported value.
            // A more robust solution would fetch from server if this becomes an issue.
            setExcludedIds(new Set(initialExclusions));
        }
    }, [isOpen]);

    const handleExclusionsChange = (newExcludedIds: Set<string>) => {
        setExcludedIds(newExcludedIds);
        setHasChanges(true);
    };

    const handleSave = async () => {
        setStatusMessage('Saving...');
        try {
            const response = await fetch('/api/update-exclusions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Array.from(excludedIds)),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save.');
            }
            setStatusMessage('Success! Please run `prepare_data.py` and refresh the page to apply changes.');
            setHasChanges(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            setStatusMessage(`Error: ${message}`);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Developer Tools: Skill Exclusions" size="lg">
            <div className="my-4">
                <DualListBox
                    allItems={allSkills}
                    initialExcludedIds={excludedIds}
                    onChange={handleExclusionsChange}
                    availableTitle="Available Skills"
                    excludedTitle="Excluded Skills"
                />
            </div>
            {statusMessage && (
                <p className={`mt-4 text-sm ${statusMessage.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
                    {statusMessage}
                </p>
            )}
            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>Close</button>
                <button className="button button--primary" onClick={handleSave} disabled={!hasChanges}>Save Changes</button>
            </div>
        </Modal>
    );
};

export default DevToolsModal;