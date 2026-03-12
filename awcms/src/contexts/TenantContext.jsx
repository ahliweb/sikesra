
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setGlobalTenantId } from '@/lib/customSupabaseClient';

const TenantContext = createContext(undefined);

export const TenantProvider = ({ children }) => {
    const [currentTenant, setCurrentTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const resolveTenant = async () => {
            try {
                const hostname = window.location.hostname;
                let lookupDomain = hostname;

                // Dev mode handling: Use VITE_DEV_TENANT_SLUG or fall back to 'primary'
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    lookupDomain = import.meta.env.VITE_DEV_TENANT_SLUG || 'primary';
                    console.log('[TenantContext] Dev mode detected. Using slug:', lookupDomain);
                }

                // Call RPC logic
                const { data, error } = await supabase
                    .rpc('get_tenant_by_domain', { lookup_domain: lookupDomain });

                if (error) {
                    throw error;
                }

                if (mounted) {
                    if (data) {
                        console.log('[TenantContext] Resolved Tenant:', data.name, data.id);
                        if (data.status !== 'active') {
                            console.warn('[TenantContext] Tenant is not active:', data.status);
                            setError('Tenant is suspended or inactive');
                        }
                        // CRITICAL: Set the global tenant ID for the Supabase Client (RLS)
                        setGlobalTenantId(data.id);
                        setCurrentTenant(data);
                    } else {
                        console.warn('[TenantContext] No tenant found for domain:', lookupDomain);
                        setError('Tenant not found');
                    }
                }

            } catch (err) {
                console.error('[TenantContext] Resolution error:', err);
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        resolveTenant();

        return () => {
            mounted = false;
        };
    }, []);

    const value = React.useMemo(() => ({ currentTenant, loading, error }), [currentTenant, loading, error]);

    return (
        <TenantContext.Provider value={value}>
            {/* 
        Blocking render strategy:
        We don't want to show ANY app UI until we know which tenant we are on.
        Unless it's a critical error we might want to show a custom 404 page here.
      */}
            {loading ? (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <h1 className="text-2xl font-bold mb-2">Tenant Not Found</h1>
                    <p className="text-gray-600">The requested domain is not configured.</p>
                    {/* Debug info for dev */}
                    {import.meta.env.DEV && <pre className="mt-4 p-2 bg-gray-100 rounded text-xs">{error}</pre>}
                </div>
            ) : (
                children
            )}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
