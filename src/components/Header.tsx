import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import SettingsModal from './SettingsModal.tsx';
import InfoModal from './InfoModal.tsx';
import './Header.css';
import DevToolsModal from './DevToolsModal.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWrench, faSliders, faMoon, faSun, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const Header = () => {
    const { t } = useTranslation('header');
    const [theme, toggleTheme] = useTheme();
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isInfoModalOpen, setInfoModalOpen] = useState(false);
    const [isDevToolsModalOpen, setDevToolsModalOpen] = useState(false);

    return (
        <>
            <header className="header mb-8 text-center">
                <h1 className="header__title text-4xl font-bold">{t('title')}</h1>
                <p className="header__subtitle mt-2">{t('subtitle')}</p>
                <p className="mt-4 text-sm italic text-stone-500 dark:text-stone-400">
                    {t('disclaimer')}
                </p>
                <div className="header__actions">
                    {import.meta.env.DEV && (
                        <button id="dev-tools-btn" className="theme-toggle" title={t('devTools')} onClick={() => setDevToolsModalOpen(true)}>
                            <FontAwesomeIcon icon={faWrench} className="icon" />
                        </button>
                    )}
                    <button id="settings-btn" className="theme-toggle" title={t('settings')} onClick={() => setSettingsModalOpen(true)}>
                        <FontAwesomeIcon icon={faSliders} className="icon" />
                    </button>
                    <button id="theme-toggle-btn" className="theme-toggle" title={t('toggleTheme')} onClick={toggleTheme}>
                        {theme === 'light' ? (
                            <FontAwesomeIcon icon={faMoon} className="icon" />
                        ) : (
                            <FontAwesomeIcon icon={faSun} className="icon" />
                        )}
                    </button>
                    <button id="info-btn" className="theme-toggle" title={t('about')} onClick={() => setInfoModalOpen(true)}>
                        <FontAwesomeIcon icon={faCircleInfo} className="icon" />
                    </button>
                </div>
            </header>

            {import.meta.env.DEV && (
                <DevToolsModal
                    isOpen={isDevToolsModalOpen}
                    onClose={() => setDevToolsModalOpen(false)}
                />
            )}

            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />
            
            <InfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setInfoModalOpen(false)}
            />
        </>
    );
};

export default Header;