import { useMemo } from 'react';
import { Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './PurchaseOrderInfoModal.css';

interface PurchaseOrderInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupedSkills: [string, Skill[]][];
    spBudget: number;
}

const PurchaseOrderInfoModal = ({ isOpen, onClose, groupedSkills, spBudget }: PurchaseOrderInfoModalProps) => {
    const { t } = useTranslation(['roster', 'goal', 'common']);
    const { dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    const simulatedPurchaseList = useMemo(() => {
        let runningTotal = 0;
        let rank = 1;
        
        const flattenedSkills = groupedSkills.flatMap(([, skills]) => skills);

        return flattenedSkills.map(skill => {
            const cost = skill.sp_cost || 150;
            const isAffordable = runningTotal + cost <= spBudget;
            if (isAffordable) {
                runningTotal += cost;
            }
            return {
                skill,
                rank: rank++,
                cost,
                runningTotal,
                isAffordable
            };
        });
    }, [groupedSkills, spBudget]);

    const totalSpent = simulatedPurchaseList.filter(item => item.isAffordable).reduce((sum, item) => sum + item.cost, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.purchaseOrder.title')} size="lg">
            <div className="purchase-order-modal__content">
                <p className="purchase-order-modal__explanation" dangerouslySetInnerHTML={{ __html: t('breedingPlanner.purchaseOrder.explanation') }} />
                
                <div className="purchase-order-modal__grid">
                    {groupedSkills.map(([tier, skillsInTier]) => {
                        const itemsInTier = simulatedPurchaseList.filter(item => skillsInTier.some(s => s.id === item.skill.id));
                        if (itemsInTier.length === 0) return null;

                        return (
                            <div key={tier} className="purchase-order-modal__group">
                                <h4 className="purchase-order-modal__tier-title">
                                    {tier === 'Other' ? t('otherSkills', { ns: 'common' }) : `${t('goal:wishlist.rank')} ${tier}`}
                                </h4>
                                <ul className="purchase-order-modal__list">
                                    {itemsInTier.map(({ skill, rank, cost, runningTotal, isAffordable }) => (
                                        <li key={skill.id} className={`purchase-order-modal__item ${!isAffordable ? 'purchase-order-modal__item--unaffordable' : ''}`}>
                                            <span className="purchase-order-modal__item-rank">{rank}.</span>
                                            <span className="purchase-order-modal__item-name">{skill[displayNameProp]}</span>
                                            <span className="purchase-order-modal__item-cost">{cost} SP</span>
                                            <span className="purchase-order-modal__item-total">{runningTotal} SP</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
                 <div className="purchase-order-modal__summary">
                    Total Spent: {totalSpent} / {spBudget} SP
                </div>
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
            </div>
        </Modal>
    );
};

export default PurchaseOrderInfoModal;