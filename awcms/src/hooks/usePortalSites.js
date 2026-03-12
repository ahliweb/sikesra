/**
 * usePortalSites - Hook for managing portal site URLs per tenant.
 *
 * Stores an array of { name, url } objects in the settings table
 * under key "portal_sites". Falls back to VITE_PUBLIC_PORTAL_URL.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useTenant } from '@/contexts/TenantContext';

const SETTINGS_KEY = 'portal_sites';

const DEFAULT_PORTAL = {
    name: 'Primary',
    url: import.meta.env.VITE_PUBLIC_PORTAL_URL || 'http://localhost:4321',
};

export function usePortalSites() {
    const { currentTenant } = useTenant();
    const [portals, setPortals] = useState([DEFAULT_PORTAL]);
    const [loading, setLoading] = useState(true);

    const fetchPortals = useCallback(async () => {
        if (!currentTenant?.id) {
            setPortals([DEFAULT_PORTAL]);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('tenant_id', currentTenant.id)
                .eq('key', SETTINGS_KEY)
                .maybeSingle();

            if (error) throw error;

            if (data?.value) {
                const parsed = typeof data.value === 'string'
                    ? JSON.parse(data.value)
                    : data.value;

                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPortals(parsed);
                } else {
                    setPortals([DEFAULT_PORTAL]);
                }
            } else {
                setPortals([DEFAULT_PORTAL]);
            }
        } catch (err) {
            console.error('Error fetching portal sites:', err);
            setPortals([DEFAULT_PORTAL]);
        } finally {
            setLoading(false);
        }
    }, [currentTenant?.id]);

    useEffect(() => {
        fetchPortals();
    }, [fetchPortals]);

    const savePortals = useCallback(async (newPortals) => {
        if (!currentTenant?.id) return { error: 'No tenant context' };

        try {
            const { error } = await supabase
                .from('settings')
                .upsert(
                    {
                        tenant_id: currentTenant.id,
                        key: SETTINGS_KEY,
                        value: JSON.stringify(newPortals),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'tenant_id,key' }
                );

            if (error) throw error;

            setPortals(newPortals);
            return { error: null };
        } catch (err) {
            console.error('Error saving portal sites:', err);
            return { error: err.message };
        }
    }, [currentTenant?.id]);

    return { portals, loading, savePortals, refetch: fetchPortals };
}
