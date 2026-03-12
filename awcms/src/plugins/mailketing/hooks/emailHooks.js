/**
 * Mailketing Plugin Hooks
 * Action and filter hooks for email extensibility
 */

import { doAction, applyFilters } from '@/contexts/PluginContext';

/**
 * Available Action Hooks:
 * - email_sent: Triggered after successful email send
 * - email_failed: Triggered when email send fails
 * - subscriber_added: Triggered when new subscriber is added
 * - email_opened: Triggered when webhook reports email opened
 * - email_clicked: Triggered when webhook reports link clicked
 * - email_bounced: Triggered when email bounces
 */

/**
 * Available Filter Hooks:
 * - email_content: Modify email HTML content before sending
 * - email_templates: Modify available email templates
 * - email_recipients: Modify recipient list before sending
 * - email_config: Modify email configuration
 */

/**
 * Trigger email_sent action
 * @param {Object} data - { to, subject, response, tenantId }
 */
export const triggerEmailSent = (data) => {
    doAction('email_sent', data);
};

/**
 * Trigger email_failed action
 * @param {Object} data - { to, subject, error, tenantId }
 */
export const triggerEmailFailed = (data) => {
    doAction('email_failed', data);
};

/**
 * Trigger subscriber_added action
 * @param {Object} data - { email, firstName, lastName, listId, tenantId }
 */
export const triggerSubscriberAdded = (data) => {
    doAction('subscriber_added', data);
};

/**
 * Apply email_content filter
 * @param {string} content - Original email HTML
 * @param {Object} context - { to, subject, tenantId }
 * @returns {string} Filtered content
 */
export const filterEmailContent = (content, context) => {
    return applyFilters('email_content', content, context);
};

/**
 * Apply email_templates filter
 * @param {Array} templates - Array of template objects
 * @returns {Array} Filtered templates
 */
export const filterEmailTemplates = (templates) => {
    return applyFilters('email_templates', templates);
};

/**
 * Apply email_recipients filter
 * @param {Array} recipients - Array of email addresses
 * @param {Object} context - Email context
 * @returns {Array} Filtered recipients
 */
export const filterEmailRecipients = (recipients, context) => {
    return applyFilters('email_recipients', recipients, context);
};

/**
 * Default email templates
 */
export const DEFAULT_TEMPLATES = [
    {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{tenant_name}}',
        content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Welcome!</h1>
                <p>Thank you for joining {{tenant_name}}.</p>
                <p>We're excited to have you on board.</p>
            </div>
        `,
    },
    {
        id: 'notification',
        name: 'Notification',
        subject: 'Notification from {{tenant_name}}',
        content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>{{subject}}</h2>
                <p>{{message}}</p>
            </div>
        `,
    },
    {
        id: 'password_reset',
        name: 'Password Reset',
        subject: 'Reset Your Password',
        content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="{{reset_link}}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
                    Reset Password
                </a>
            </div>
        `,
    },
];

const emailHooks = {
    triggerEmailSent,
    triggerEmailFailed,
    triggerSubscriberAdded,
    filterEmailContent,
    filterEmailTemplates,
    filterEmailRecipients,
    DEFAULT_TEMPLATES,
};

export default emailHooks;
