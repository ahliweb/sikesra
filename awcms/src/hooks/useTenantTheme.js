import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';

/**
 * useTenantTheme
 * 
 * listens to the current tenant context and applies theme variables
 * to the document root safely.
 */
export function useTenantTheme() {
    const { tenant, loading } = useTenant();

    useEffect(() => {
        if (loading || !tenant) return;

        const theme = tenant.config?.theme || {};
        const root = document.documentElement;

        // 1. Apply Brand Color
        if (theme.brandColor) {
            // Validate Hex Code strictly to prevent injection
            const isHex = /^#[0-9A-F]{6}$/i.test(theme.brandColor);
            if (isHex) {
                // Set CSS variable for Tailwind/Global usage
                // Assuming --primary is used by Tailwind config or CSS
                root.style.setProperty('--primary', theme.brandColor);

                // We might need to generate shades if using specific tailwind utility classes
                // that rely on HSL or similar. For now, we set the base color.
            }
        }

        // 2. Apply Font Family
        if (theme.fontFamily) {
            // Basic sanitation: allow only alphanumeric, spaces, and hyphens
            const safeFont = theme.fontFamily.replace(/[^a-zA-Z0-9\s-]/g, '');
            if (safeFont) {
                root.style.setProperty('--font-sans', `"${safeFont}", sans-serif`);
            }
        }

        // Cleanup on unmount or tenant change (optional, but good practice)
        return () => {
            root.style.removeProperty('--primary');
            root.style.removeProperty('--font-sans');
        };

    }, [tenant, loading]);
}
