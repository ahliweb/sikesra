/**
 * Public Module Registry
 * 
 * Defines all public-facing routes/pages that can be linked in the
 * frontend navigation (header, footer, etc.).
 * 
 * Used by MenusManager for:
 * - "Add Item" module picker
 * - "Sync From Modules" functionality
 */

/**
 * @typedef {Object} PublicModule
 * @property {string} key - Unique identifier
 * @property {string} label - Display name
 * @property {string} url - Public URL path
 * @property {string} icon - Lucide icon name
 * @property {string} [group] - Optional grouping
 * @property {number} [order] - Sort order
 * @property {string[]} [portalVariants] - Supported public portal variants
 * @property {string[]} [requiredModuleSlugs] - Active tenant modules required for this route
 */

/** @type {PublicModule[]} */
export const PUBLIC_MODULES = [
    { key: 'home', label: 'Home', url: '/', icon: 'Home', group: 'Main', order: 10 },
    { key: 'about', label: 'About', url: '/about', icon: 'Info', group: 'Main', order: 20, portalVariants: ['primary'] },
    { key: 'contact', label: 'Contact', url: '/contact', icon: 'Mail', group: 'Main', order: 30, portalVariants: ['primary'] },
    { key: 'services', label: 'Services', url: '/services', icon: 'Settings', group: 'Main', order: 40, portalVariants: ['primary'] },
    { key: 'pricing', label: 'Pricing', url: '/pricing', icon: 'Wallet', group: 'Main', order: 50, portalVariants: ['primary'] },
    { key: 'blogs', label: 'Blogs', url: '/blogs', icon: 'FileText', group: 'Content', order: 100, requiredModuleSlugs: ['blogs'] },
    { key: 'search', label: 'Search', url: '/search', icon: 'Search', group: 'Discovery', order: 110, portalVariants: ['primary'] },
    { key: 'visitor_stats', label: 'Visitor Statistics', url: '/visitor-stats', icon: 'LineChart', group: 'Discovery', order: 120 },
];

export function getPublicPortalVariant(tenant) {
    return 'primary';
}

export function getPublicModulesForTenant(tenant, activeModuleSlugs = []) {
    const portalVariant = getPublicPortalVariant(tenant);
    const activeModuleSet = new Set(activeModuleSlugs.filter(Boolean));

    return PUBLIC_MODULES
        .filter((module) => {
            if (module.portalVariants && !module.portalVariants.includes(portalVariant)) {
                return false;
            }

            if (!module.requiredModuleSlugs || module.requiredModuleSlugs.length === 0) {
                return true;
            }

            return module.requiredModuleSlugs.every((slug) => activeModuleSet.has(slug));
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Get modules grouped by category
 * @param {Record<string, unknown>} [tenant]
 * @param {string[]} [activeModuleSlugs]
 * @returns {Object.<string, PublicModule[]>}
 */
export function getModulesByGroup(tenant, activeModuleSlugs = []) {
    const groups = {};
    getPublicModulesForTenant(tenant, activeModuleSlugs).forEach(mod => {
        const group = mod.group || 'Other';
        if (!groups[group]) groups[group] = [];
        groups[group].push(mod);
    });
    Object.values(groups).forEach(items => items.sort((a, b) => (a.order || 0) - (b.order || 0)));
    return groups;
}

/**
 * Find a module by key
 * @param {string} key 
 * @returns {PublicModule|undefined}
 */
export function getModuleByKey(key) {
    return PUBLIC_MODULES.find(m => m.key === key);
}

export default PUBLIC_MODULES;
