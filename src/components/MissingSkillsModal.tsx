import { useMemo, useState, useEffect } from 'react';
import { BreedingPair } from '../types';
import Modal from './common/Modal';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { getMissingWishlistSkills, getUnsaturatedWishlistSkills } from '../utils/affinity';
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
    
    const [checkedSkills, setCheckedSkills] = useState(new Set<string>());

    useEffect(() => {
        // Reset checked skills every time the modal opens
        if (isOpen) {
            setCheckedSkills(new Set<string>());
        }
    }, [isOpen]);

    const { missingSkills, unsaturatedSkills, totalWishlistCount } = useMemo(() => {
        if (!pair || !activeProfile?.goal) {
            return { missingSkills: [], unsaturatedSkills: [], totalWishlistCount: 0 };
        }
        const { missingSkills: missing, relevantWishlistCount } = getMissingWishlistSkills(pair.p1, pair.p2, activeProfile.goal, inventoryMap, skillMapByName);
        const unsaturated = getUnsaturatedWishlistSkills(pair.p1, pair.p2, activeProfile.goal, inventoryMap, skillMapByName);
        return { missingSkills: missing, unsaturatedSkills: unsaturated, totalWishlistCount: relevantWishlistCount };
    }, [pair, activeProfile, inventoryMap, skillMapByName]);

    const handleToggleSkill = (skillName: string) => {
        setCheckedSkills(prev => {
            const newSet = new Set(prev);
            if (newSet.has(skillName)) {
                newSet.delete(skillName);
            } else {
                newSet.add(skillName);
            }
            return newSet;
        });
    };

    const handleClearChecks = () => {
        setCheckedSkills(new Set<string>());
    };

    if (!pair) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('missingSkillsTitle')} size="lg">
            <div className="missing-skills-modal__content">
                <MissingSkillsDisplay 
                    missingSkills={missingSkills} 
                    unsaturatedSkills={unsaturatedSkills}
                    totalWishlistCount={totalWishlistCount}
                    checkedSkills={checkedSkills}
                    onToggleSkill={handleToggleSkill}
                    onClearChecks={handleClearChecks}
                />
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
            </div>
        </Modal>
    );
};

export default MissingSkillsModal;