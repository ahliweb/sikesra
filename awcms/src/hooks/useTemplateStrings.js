import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * useTemplateStrings - Hook for fetching localized template strings with fallback.
 * 
 * @param {string} locale - The desired locale (e.g., 'id', 'en')
 * @param {string} fallbackLocale - The fallback locale (default: 'en')
 * @returns {object} - { strings, loading, t } where t(key) returns the translated string.
 */
export const useTemplateStrings = (locale = 'en', fallbackLocale = 'en') => {
    const [strings, setStrings] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchStrings = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch strings for the desired locale
            const { data: primaryData, error: primaryError } = await supabase
                .from('template_strings')
                .select('key, value')
                .eq('locale', locale);

            if (primaryError) console.warn('Error fetching primary locale:', primaryError);

            // Fetch strings for the fallback locale
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('template_strings')
                .select('key, value')
                .eq('locale', fallbackLocale);

            if (fallbackError) console.warn('Error fetching fallback locale:', fallbackError);

            // Merge: Fallback first, then primary (primary overrides)
            const merged = {};
            (fallbackData || []).forEach(s => {
                merged[s.key] = s.value;
            });
            (primaryData || []).forEach(s => {
                if (s.value) { // Only override if primary has a value
                    merged[s.key] = s.value;
                }
            });

            setStrings(merged);
        } catch (error) {
            console.error('Error in useTemplateStrings:', error);
        } finally {
            setLoading(false);
        }
    }, [locale, fallbackLocale]);

    useEffect(() => {
        fetchStrings();
    }, [fetchStrings]);

    /**
     * Translate a key. Returns the key itself if not found (for debugging).
     * @param {string} key - The translation key
     * @param {string} defaultValue - Optional default value if key not found
     * @returns {string}
     */
    const t = (key, defaultValue = key) => {
        return strings[key] || defaultValue;
    };

    return { strings, loading, t, refresh: fetchStrings };
};
