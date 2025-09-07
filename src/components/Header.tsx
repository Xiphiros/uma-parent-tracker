import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import SettingsModal from './SettingsModal';
import InfoModal from './InfoModal';
import './Header.css';

const Header = () => {
    const [theme, toggleTheme] = useTheme();
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isInfoModalOpen, setInfoModalOpen] = useState(false);

    return (
        <>
            <header className="header mb-8 text-center">
                <h1 className="header__title text-4xl font-bold">Umamusume Parent Tracker</h1>
                <p className="header__subtitle mt-2">A point-based system for progressive parent farming.</p>
                <div className="header__actions">
                    <button id="settings-btn" className="theme-toggle" title="Settings" onClick={() => setSettingsModalOpen(true)}>
                        <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a1 1 0 0 0-2 0v2.268a2 2 0 0 0 0 3.464V16a1 1 0 0 0 2 0v-6.268a2 2 0 0 0 0-3.464V4ZM11 4a1 1 0 1 0-2 0v2.268a2 2 0 0 0 0 3.464V16a1 1 0 1 0 2 0v-6.268a2 2 0 0 0 0-3.464V4ZM17 4a1 1 0 1 0-2 0v2.268a2 2 0 0 0 0 3.464V16a1 1 0 1 0 2 0v-6.268a2 2 0 0 0 0-3.464V4Z" />
                        </svg>
                    </button>
                    <button id="theme-toggle-btn" className="theme-toggle" title="Toggle theme" onClick={toggleTheme}>
                        {theme === 'light' ? (
                            <svg className="icon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.455 2.104a.75.75 0 00-.965.572A9.003 9.003 0 002.5 12.162a9.003 9.003 0 008.59 8.592.75.75 0 00.572-.965A5.25 5.25 0 017.455 2.104z" /></svg>
                        ) : (
                            <svg className="icon sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 4.343a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM5.404 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM17.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM14.596 5.404a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM6.464 13.536a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                    <button id="info-btn" className="theme-toggle" title="About" onClick={() => setInfoModalOpen(true)}>
                        <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </header>

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