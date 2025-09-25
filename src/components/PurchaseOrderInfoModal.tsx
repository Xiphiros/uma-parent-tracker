import { Skill } from '../types';
import Modal from './common/Modal';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import './PurchaseOrderInfoModal.css';

interface PurchaseOrderInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupedSkills: [string, Skill[]][];
}

const PurchaseOrderInfoModal = ({ isOpen, onClose, groupedSkills }: PurchaseOrderInfoModalProps) => {
    const { t } = useTranslation(['roster', 'goal', 'common']);
    const { dataDisplayLanguage } = useAppContext();
    const displayNameProp = dataDisplayLanguage === 'jp' ? 'name_jp' : 'name_en';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('breedingPlanner.purchaseOrder.title')} size="lg">
            <div className="purchase-order-modal__content">
                <p className="purchase-order-modal__explanation" dangerouslySetInnerHTML={{ __html: t('breedingPlanner.purchaseOrder.explanation') }} />
                
                <div className="purchase-order-modal__grid">
                    {groupedSkills.map(([tier, skills]) => (
                        <div key={tier} className="purchase-order-modal__group">
                            <h4 className="purchase-order-modal__tier-title">
                                {tier === 'Other' ? t('otherSkills', { ns: 'common' }) : `${t('goal:wishlist.rank')} ${tier}`}
                            </h4>
                            <ul className="purchase-order-modal__list">
                                {skills.map((skill, index) => (
                                    <li key={skill.id} className="purchase-order-modal__item">
                                        <span className="purchase-order-modal__item-rank">{index + 1}.</span>
                                        <span className="purchase-order-modal__item-name">{skill[displayNameProp]}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            <div className="dialog-modal__footer">
                <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
            </div>
        </Modal>
    );
};

export default PurchaseOrderInfoModal;