import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import SettingsModal from './SettingsModal';
import './Header.css';

const Header = () => {
    const [theme, toggleTheme] = useTheme();
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

    return (
        <>
            <header className="header mb-8 text-center">
                <h1 className="header__title text-4xl font-bold">Umamusume Parent Tracker</h1>
                <p className="header__subtitle mt-2">A point-based system for progressive parent farming.</p>
                <div className="header__actions">
                    <button id="settings-btn" className="theme-toggle" title="Settings" onClick={() => setSettingsModalOpen(true)}>
                        <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17a.75.75 0 01.447.886l-1.353 4.869a.75.75 0 01-1.341.342l-1.353-4.869a.75.75 0 01.886-1.034l1.712.433zM10 0a.75.75 0 01.75.75v1.252a.75.75 0 01-1.5 0V.75A.75.75 0 0110 0zM7.5 15.586a.75.75 0 00-1.06 1.06l-1.152 1.151a.75.75 0 001.06 1.06l1.152-1.151a.75.75 0 00-1.06-1.06zM13.53 16.646a.75.75 0 001.06-1.06l1.151-1.152a.75.75 0 00-1.06-1.06l-1.151 1.152a.75.75 0 00-1.06 1.06zM2 10a.75.75 0 01.75-.75h1.252a.75.75 0 010 1.5H2.75A.75.75 0 012 10zM15.248 10a.75.75 0 01.75-.75h1.252a.75.75 0 010 1.5h-1.252a.75.75 0 01-.75-.75zM6.47 4.354a.75.75 0 00-1.06-1.06L4.258 4.445a.75.75 0 001.06 1.06L6.47 4.354zM14.596 5.404a.75.75 0 001.06-1.06l-1.152-1.151a.75.75 0 10-1.06 1.06l1.152 1.151zM10 18a.75.75 0 01.75-.75v-1.252a.75.75 0 01-1.5 0v1.252c0 .414.336.75.75.75zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd" /></svg>
                    </button>
                    <button id="theme-toggle-btn" className="theme-toggle" title="Toggle theme" onClick={toggleTheme}>
                        {theme === 'light' ? (
                            <svg className="icon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7.455 2.104a.75.75 0 00-.965.572A9.003 9.003 0 002.5 12.162a9.003 9.003 0 008.59 8.592.75.75 0 00.572-.965A5.25 5.25 0 017.455 2.104z" /></svg>
                        ) : (
                            <svg className="icon sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 4.343a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM5.404 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM17.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM14.596 5.404a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM6.464 13.536a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                </div>
            </header>

            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />
        </>
    );
};

export default Header;