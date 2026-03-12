/**
 * WordPress-style Hooks System
 * 
 * Provides a mechanism for plugins to register actions and filters to modify
 * core behavior or inject content.
 */

export function createHooks() {
    const actions = {};
    const filters = {};

    /**
     * Add an action (event listener)
     * @param {string} hookName - The name of the action (e.g., 'dashboard_init')
     * @param {string} namespace - Unique namespace for the callback (e.g., 'my_plugin_init')
     * @param {function} callback - The function to run
     * @param {number} priority - Execution order (lower runs first, default 10)
     */
    function addAction(hookName, namespace, callback, priority = 10) {
        if (!actions[hookName]) {
            actions[hookName] = [];
        }

        // Remove existing callback with same namespace to prevent duplicates (hot reload friendly)
        actions[hookName] = actions[hookName].filter(cb => cb.namespace !== namespace);

        actions[hookName].push({ namespace, callback, priority });
        actions[hookName].sort((a, b) => a.priority - b.priority);
    }

    /**
     * Execute an action (trigger event)
     * @param {string} hookName - The name of the action to trigger
     * @param  {...any} args - Arguments to pass to callbacks
     */
    function doAction(hookName, ...args) {
        if (actions[hookName]) {
            actions[hookName].forEach(action => {
                try {
                    action.callback(...args);
                } catch (error) {
                    console.error(`Error in action "${hookName}" (namespace: ${action.namespace}):`, error);
                }
            });
        }
    }

    /**
     * Add a filter (modify data)
     * @param {string} hookName - The name of the filter (e.g., 'admin_menu_items')
     * @param {string} namespace - Unique namespace for the callback
     * @param {function} callback - Function that receives value and returns modified value
     * @param {number} priority - Execution order
     */
    function addFilter(hookName, namespace, callback, priority = 10) {
        if (!filters[hookName]) {
            filters[hookName] = [];
        }

        // Remove existing callback with same namespace
        filters[hookName] = filters[hookName].filter(cb => cb.namespace !== namespace);

        filters[hookName].push({ namespace, callback, priority });
        filters[hookName].sort((a, b) => a.priority - b.priority);
    }

    /**
     * Apply filters (run modifiers)
     * @param {string} hookName - The name of the filter
     * @param {any} value - The initial value to be modified
     * @param  {...any} args - Additional arguments
     * @returns {any} The modified value
     */
    function applyFilters(hookName, value, ...args) {
        if (!filters[hookName]) {
            return value;
        }

        let currentValue = value;
        filters[hookName].forEach(filter => {
            try {
                currentValue = filter.callback(currentValue, ...args);
            } catch (error) {
                console.error(`Error in filter "${hookName}" (namespace: ${filter.namespace}):`, error);
            }
        });

        return currentValue;
    }

    /**
     * Remove an action
     */
    function removeAction(hookName, namespace) {
        if (actions[hookName]) {
            actions[hookName] = actions[hookName].filter(cb => cb.namespace !== namespace);
        }
    }

    /**
     * Remove a filter
     */
    function removeFilter(hookName, namespace) {
        if (filters[hookName]) {
            filters[hookName] = filters[hookName].filter(cb => cb.namespace !== namespace);
        }
    }

    return {
        addAction,
        doAction,
        addFilter,
        applyFilters,
        removeAction,
        removeFilter
    };
}

// Singleton instance for global usage if needed
export const hooks = createHooks();
