import { Parent } from '../types';
import Modal from './common/Modal';
import ParentCard from './ParentCard';
import { useTranslation } from 'react-i18next';

interface ParentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    parent: Parent | null;
}

const ParentDetailModal = ({ isOpen, onClose, parent }: ParentDetailModalProps) => {
    const { t } = useTranslation('modals');

    if (!parent) return null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('parentDetailsTitle')} size="lg">
            <div className="my-4">
                <ParentCard parent={parent} displayScore={true} />
            </div>
             <div className="dialog-modal__footer">
                <button className="button button--primary" onClick={onClose}>Close</button>
            </div>
        </Modal>
    );
};

export default ParentDetailModal;