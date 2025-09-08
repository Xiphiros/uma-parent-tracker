import Modal from './common/Modal';
import './InfoModal.css';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const APP_VERSION = '0.6.2';

const InfoModal = ({ isOpen, onClose }: InfoModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="About This Application" size="lg">
            <div className="info-modal__content">
                <h3 className="info-modal__app-title">Umamusume Parent Tracker</h3>
                <p className="info-modal__meta">Version {APP_VERSION} (In Development) &bull; Created by Xiph</p>

                <div className="info-modal__section">
                    <h4 className="info-modal__section-title">License</h4>
                    <p className="info-modal__text">
                        This application is licensed under the MIT License.
                    </p>
                    <p className="info-modal__text info-modal__text--muted mt-2">
                        The underlying skill, character, and game data is sourced from the 'uma-tools' project, which is distributed under the GNU General Public License v3.0.
                    </p>
                </div>

                <div className="info-modal__section">
                    <h4 className="info-modal__section-title">Data Source & Credits</h4>
                    <p className="info-modal__text">
                        This tool would not be possible without the incredible work done by Alpha123 on the{' '}
                        <a href="https://github.com/alpha123/uma-tools" target="_blank" rel="noopener noreferrer">uma-tools</a> project.
                    </p>
                </div>
                
                <div className="info-modal__section">
                    <h4 className="info-modal__section-title">Special Thanks</h4>
                    <p className="info-modal__text">
                        Thank you to <em>Diabellstar</em> and <em>Sloovy</em> for their help with testing and feedback.
                    </p>
                </div>

                <div className="dialog-modal__footer">
                    <button className="button button--primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </Modal>
    );
};

export default InfoModal;