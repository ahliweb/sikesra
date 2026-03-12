import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'awcms_theme';
const OLD_STORAGE_KEY = 'awcms-dark-mode';

/**
 * Dark Mode Context
 * Manages light/dark/system theme preference
 * Supports migration from legacy keys
 */
const DarkModeContext = createContext({
    mode: 'system', // 'light' | 'dark' | 'system'
    isDark: false,
    setMode: () => { },
});

export const useDarkMode = () => useContext(DarkModeContext);

export const DarkModeProvider = ({ children }) => {
    const [mode, setModeState] = useState('system');
    const [isDark, setIsDark] = useState(false);

    // Apply dark class to document
    const applyDarkClass = (dark) => {
        if (dark) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
        }
        setIsDark(dark);
    };

    // Check system preference
    const getSystemPreference = () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    // Update theme based on mode
    const updateTheme = React.useCallback((currentMode) => {
        if (currentMode === 'system') {
            applyDarkClass(getSystemPreference());
        } else {
            applyDarkClass(currentMode === 'dark');
        }
    }, []);

    // Set mode and persist
    const setMode = (newMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
        updateTheme(newMode);
    };

    // Initialize on mount
    useEffect(() => {
        let initialMode = 'system';

        // 1. Try new key
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
            initialMode = stored;
        } else {
            // 2. Try migration from old key
            const oldStored = localStorage.getItem(OLD_STORAGE_KEY);
            if (oldStored && ['light', 'dark', 'system'].includes(oldStored)) {
                initialMode = oldStored;
                // Migrate to new key
                localStorage.setItem(STORAGE_KEY, oldStored);
                localStorage.removeItem(OLD_STORAGE_KEY);
            }
        }

        setModeState(initialMode);
        updateTheme(initialMode);

        // System preference change handling is done in the separate useEffect below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle system changes and mode updates
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleSystemChange = (e) => {
            if (mode === 'system') {
                applyDarkClass(e.matches);
            }
        };

        // Update immediately on mode change
        updateTheme(mode);

        // Subscribe to system changes
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }, [mode, updateTheme]);

    return (
        <DarkModeContext.Provider value={{ mode, isDark, setMode }}>
            {children}
        </DarkModeContext.Provider>
    );
};
