
import { useState, useEffect } from 'react';
import { supabase, setGlobalTenantId } from '@/lib/customSupabaseClient';

/**
 * Hook to resolve and manage public tenant context based on hostname/subdomain.
 * 
 * Logic:
 * 1. Checks hostname.
 * 2. Parses slug from subdomain (e.g., "demo.awcms.com" -> "demo").
 * 3. Fetches tenant details from Supabase.
 * 4. Sets Global Tenant ID for RLS.
 */
export function usePublicTenant() {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const resolveTenant = async () => {
            setLoading(true);
            try {
                const hostname = window.location.hostname;
                let slug = '';

                // Logic to extract slug from hostname
                // Adjust this matching based on your actual domain structure
                // e.g., localhost:3000 -> default or none? 
                // e.g., tenant.localhost -> tenant
                // e.g., tenant.site.com -> tenant

                const parts = hostname.split('.');

                // Development/Localhost handling
                if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                    if (parts.length > 1 && parts[0] !== 'www') {
                        slug = parts[0];
                    } else {
                        // Fallback for strict localhost development - maybe hardcoded or first tenant?
                        // For now, let's look for a 'default' tenant or specific env var? 
                        // Or just ignore and let it be null (Platform/Root site).
                        slug = 'default'; // Assumption for dev
                    }
                } else {
                    // Production
                    // If custom domain, we search by domain column
                    // If subdomain, we search by slug
                    if (parts.length > 2) {
                        slug = parts[0];
                    }
                }

                // Query Tenant
                let query = supabase.from('tenants').select('id, name, slug, config, subscription_tier');

                // If it looks like a custom domain (not our base domain)
                // This logic depends on knowing the base domain. 
                // For this refactor, we'll stick to slug/subdomain primarily.

                if (slug) {
                    query = query.eq('slug', slug);
                } else {
                    // Try domain match?
                    query = query.eq('domain', hostname);
                }

                const { data, error } = await query.maybeSingle();

                if (error) throw error;

                if (data) {
                    setTenant(data);
                    // CRITICAL: Set Global ID for RLS policies
                    setGlobalTenantId(data.id);
                } else {
                    console.warn(`No tenant found for hostname: ${hostname} (slug: ${slug})`);
                }

            } catch (err) {
                console.error('Error resolving public tenant:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        resolveTenant();
    }, []);

    return { tenant, loading, error };
}
