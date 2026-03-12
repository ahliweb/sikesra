/**
 * Template Extension APIs
 * 
 * Provides APIs for plugins and external extensions to register:
 * - Template Blocks (Puck components)
 * - Widget Types (for Widget Areas)
 * - Page Types (for Route Assignment)
 */

import { hooks } from './hooks';
import { registerWidget as registerWidgetToRegistry } from './widgetRegistry';

// --- Storage for registered items (used by renderers) ---
const registeredBlocks = [];
const registeredPageTypes = [];

/**
 * Register a new Puck block for use in the Visual Builder and Public Portal.
 * 
 * @param {object} blockDef - Block definition
 * @param {string} blockDef.type - Unique type identifier (e.g., 'my_plugin/carousel')
 * @param {string} blockDef.label - Display label for the block
 * @param {React.ComponentType} blockDef.render - The React component for rendering
 * @param {object} blockDef.fields - Puck field definitions
 * @param {object} [blockDef.defaultProps] - Default props for new instances
 */
export function registerTemplateBlock(blockDef) {
    if (!blockDef.type || !blockDef.render) {
        console.error('[Template Extensions] Invalid block definition:', blockDef);
        return;
    }

    // Prevent duplicates
    if (registeredBlocks.find(b => b.type === blockDef.type)) {
        console.warn(`[Template Extensions] Block ${blockDef.type} already registered.`);
        return;
    }

    registeredBlocks.push(blockDef);

    // Fire action for visual builder to pick up
    hooks.doAction('template_block_registered', blockDef);

    console.log(`[Template Extensions] Registered block: ${blockDef.type}`);
}

/**
 * Get all registered blocks. Used by Puck config and public portal registry.
 * @returns {Array} List of block definitions
 */
export function getRegisteredBlocks() {
    return [...registeredBlocks];
}

/**
 * Register a new widget type for use in Widget Areas.
 * Wrapper around widgetRegistry.registerWidget with additional hooks.
 * 
 * @param {object} widgetDef - Widget definition
 * @param {string} widgetDef.type - Unique type (e.g., 'my_plugin/social_links')
 * @param {string} widgetDef.name - Display name
 * @param {React.ComponentType} widgetDef.icon - Lucide icon or custom icon component
 * @param {object} [widgetDef.defaultConfig] - Default configuration
 */
export function registerWidgetArea(widgetDef) {
    if (!widgetDef.type || !widgetDef.name) {
        console.error('[Template Extensions] Invalid widget definition:', widgetDef);
        return;
    }

    // Register to the core widget registry
    registerWidgetToRegistry(widgetDef);

    // Fire action
    hooks.doAction('widget_type_registered', widgetDef);

    console.log(`[Template Extensions] Registered widget: ${widgetDef.type}`);
}

/**
 * Register a new page type for Route Assignments.
 * 
 * @param {object} pageTypeDef - Page type definition
 * @param {string} pageTypeDef.type - Unique type key (e.g., 'product_single')
 * @param {string} pageTypeDef.label - Display label (e.g., 'Single Product')
 * @param {string} [pageTypeDef.description] - Optional description
 */
export function registerPageType(pageTypeDef) {
    if (!pageTypeDef.type || !pageTypeDef.label) {
        console.error('[Template Extensions] Invalid page type definition:', pageTypeDef);
        return;
    }

    // Prevent duplicates
    if (registeredPageTypes.find(p => p.type === pageTypeDef.type)) {
        console.warn(`[Template Extensions] Page type ${pageTypeDef.type} already registered.`);
        return;
    }

    registeredPageTypes.push(pageTypeDef);

    // Fire action
    hooks.doAction('page_type_registered', pageTypeDef);

    console.log(`[Template Extensions] Registered page type: ${pageTypeDef.type}`);
}

/**
 * Get all registered page types.
 * @returns {Array} List of page type definitions
 */
export function getRegisteredPageTypes() {
    return [...registeredPageTypes];
}

/**
 * Initialize template extension hooks.
 * Call this early in app startup to set up filters.
 */
export function initTemplateExtensions() {
    // Filter: Allow extensions to add blocks to the Puck config
    hooks.addFilter('puck_config_components', 'core_template_extensions', (components) => {
        const extBlocks = getRegisteredBlocks();
        extBlocks.forEach(block => {
            components[block.type] = {
                label: block.label,
                fields: block.fields || {},
                defaultProps: block.defaultProps || {},
                render: block.render
            };
        });
        return components;
    }, 100);

    // Filter: Allow extensions to add page types to the assignment list
    hooks.addFilter('template_assignment_routes', 'core_template_extensions', (routes) => {
        const extPageTypes = getRegisteredPageTypes();
        extPageTypes.forEach(pt => {
            routes.push({ type: pt.type, label: pt.label });
        });
        return routes;
    }, 100);

    console.log('[Template Extensions] Initialized.');
}
