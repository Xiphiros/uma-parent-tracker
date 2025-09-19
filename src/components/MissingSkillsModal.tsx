import { useMemo } from 'react';
import { BreedingPair } from '../types';
import Modal from './common/Modal';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { getMissingWishlistSkills } from '../utils/affinity';
import MissingSkillsDisplay from './common/MissingSkillsDisplay';
import './MissingSkillsModal.css';

interface MissingSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pair: BreedingPair | null;
}

const MissingSkillsModal = ({ isOpen, onClose, pair }: MissingSkillsModalProps) => {
    const { t } = useTranslation(['modals', 'common']);
    const { getActiveProfile, appData, skillMapByName } = useAppContext();
    const activeProfile = getActiveProfile();
    const inventoryMap = useMemo(() => new Map(appData.inventory.map(p => [p.id, p])), [appData.inventory]);

    const { missingSkills, totalWishlistCount } = useMemo(() => {
        if (!pair || !activeProfile?.goal) {
            return { missingSkills: [], totalWishlistCount: 0 };
        }
        const { missingSkills: missing, relevantWishlistCount } = getMissingWishlistSkills(pair.p1, pair.p2, activeProfile.goal, inventoryMap, skillMapByName);
        return { missingSkills: missing, totalWishlistCount: relevantWishlistCount };
    }, [pair, activeProfile, inventoryMap, skillMapByName]);

    if (!pair) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('missingSkillsTitle')} size="lg">
            <div className="missing-skills-modal__content">
                <MissingSkillsDisplay missingSkills={missingSkills} totalWishlistCount={totalWishlistCount} />
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
            </div>
        </Modal>
    );
};

export default MissingSkillsModal;