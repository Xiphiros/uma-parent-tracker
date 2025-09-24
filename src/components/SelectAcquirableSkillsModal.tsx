import Modal from './common/Modal';

interface SelectAcquirableSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    allSkills: any[]; // Replace with specific Skill type later
    selectedIds: Set<string>;
    onSave: (newSelectedIds: Set<string>) => void;
}

const SelectAcquirableSkillsModal = ({ isOpen, onClose }: SelectAcquirableSkillsModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Acquirable White Sparks" size="lg">
            <p className="my-4">Skill selection checklist will be implemented here in the next step.</p>
            <div className="dialog-modal__footer">
                <button className="button button--neutral" onClick={onClose}>Cancel</button>
                <button className="button button--primary" onClick={onClose}>Save</button>
            </div>
        </Modal>
    );
};

export default SelectAcquirableSkillsModal;