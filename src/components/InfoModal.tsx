import Modal from './common/Modal';
import './InfoModal.css';
import { useTranslation } from 'react-i18next';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const APP_VERSION = '0.8.1';

const InfoModal = ({ isOpen, onClose }: InfoModalProps) => {
    const { t } = useTranslation(['info', 'common']);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('title')} size="lg">
            <div className="info-modal__content">
                <h3 className="info-modal__app-title">{t('appTitle')}</h3>
                <p className="info-modal__meta">{t('meta', { version: APP_VERSION })}</p>

                <div className="info-modal__section">
                    <h4 className="info-modal__section-title">{t('licenseTitle')}</h4>
                    <p className="info-modal__text">
                        {t('licenseText')}
                    </p>
                    <p className="info-modal__text info-modal__text--muted mt-2">
                        {t('licenseMutedText')}
                    </p>
                </div>

                <div className="info-modal__section">
                    <h4 className="info-modal__section-title">{t('creditsTitle')}</h4>
                    <p className="info-modal__text">
                        {t('creditsText')}{' '}
                        <a href="https://github.com/alpha123/uma-tools" target="_blank" rel="noopener noreferrer">{t('creditsLink')}</a> project.
                    </p>
                </div>
                
                <div className="info-modal__section">
                    <h4 className="info-modal__section-title">{t('thanksTitle')}</h4>
                    <p className="info-modal__text" dangerouslySetInnerHTML={{ __html: t('thanksText') }} />
                </div>

                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={onClose}>{t('common:close')}</button>
                </div>
            </div>
        </Modal>
    );
};

export default InfoModal;