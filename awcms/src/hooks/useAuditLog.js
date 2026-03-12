import { useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionContext';

/**
 * Hook for structured ERP Audit Logging
 * @returns {object} { logAction }
 */
export function useAuditLog() {
    const { user } = useAuth();
    const { tenantId } = usePermissions();

    /**
     * Logs an action to the audit_logs table
     * @param {string} action - Action name (e.g. 'user.create', 'post.publish')
     * @param {string} resource - Resource name (e.g. 'users', 'posts')
     * @param {string} resourceId - ID of the resource
     * @param {object} details - { oldValue, newValue, ...otherDetails }
     * @param {object} options - { channel: 'web'|'mobile' }
     */
    const logAction = useCallback(async (action, resource, resourceId, details = {}, options = {}) => {
        if (!user || !tenantId) return;

        try {
            const channel = options.channel || 'web';

            // Extract known fields, put rest in 'details' if needed
            // Current schema: old_value, new_value JSONB

            const payload = {
                tenant_id: tenantId,
                user_id: user.id,
                action,
                resource,
                resource_id: resourceId?.toString(),
                old_value: details.oldValue ? JSON.stringify(details.oldValue) : null,
                new_value: details.newValue ? JSON.stringify(details.newValue) : null,
                channel,
                user_agent: navigator.userAgent,
                // ip_address: handled by server/edge function usually, but placeholder here
            };

            const { error } = await supabase.from('audit_logs').insert(payload);

            if (error) {
                console.warn('AuditLog Error:', error.message);
            }
        } catch (err) {
            console.error('Failed to write audit log:', err);
        }
    }, [user, tenantId]);

    return { logAction };
}
