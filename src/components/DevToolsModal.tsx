import { useState, useEffect } from 'react';
import Modal from './common/Modal';
import { DualListBox } from './common/DualListBox';

interface DevToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DevSkill {
    id: string;
    name_en: string;
}

interface Item {
    id: string;
    name: string;
}

const DevToolsModal = ({ isOpen, onClose }: DevToolsModalProps) => {
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [allSkills, setAllSkills] = useState<Item[]>([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setStatusMessage('');
            setHasChanges(false);
            
            Promise.all([
                fetch('../data/skill-list-dev.json').then(res => res.json()),
                fetch('../data/skill-exclusions.json').then(res => res.json())
            ]).then(([devSkills, initialExclusions]: [DevSkill[], string[]]) => {
                const sortedSkills = devSkills
                    .map(s => ({ id: s.id, name: s.name_en }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                setAllSkills(sortedSkills);
                setExcludedIds(new Set(initialExclusions));
            }).catch(err => {
                setStatusMessage('Error: Could not load skill data. ' + err.message);
            }).finally(() => {
                setIsLoading(false);
            });
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
            {isLoading ? (
                <p>Loading skill data...</p>
            ) : (
                <>
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
                </>
            )}
            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>Close</button>
                <button className="button button--primary" onClick={handleSave} disabled={!hasChanges || isLoading}>Save Changes</button>
            </div>
        </Modal>
    );
};

export default DevToolsModal;