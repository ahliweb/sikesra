/**
 * External Extension Loader
 * 
 * Handles dynamic loading of external extensions from awcms-ext-* folders.
 * External extensions are loaded via dynamic import for lazy loading.
 */

import React from 'react';

// Cache for loaded external extensions
const loadedExtensions = new Map();

/**
 * Validate external extension manifest
 * @param {Object} manifest - Extension manifest
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateManifest = (manifest) => {
    const errors = [];

    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.slug) errors.push('Missing required field: slug');
    if (!manifest.vendor) errors.push('Missing required field: vendor');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.entry) errors.push('Missing required field: entry');

    // Validate version format (semver)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
        errors.push('Invalid version format (expected semver: x.y.z)');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Get the base path for external extensions
 * @returns {string} Base path
 */
export const getExternalExtensionBasePath = () => {
    // In development, extensions might be in parent folder
    // In production, they could be served from a CDN or static path
    return import.meta.env.VITE_EXTERNAL_EXTENSIONS_PATH || '/ext';
};

/**
 * Build the full path to an external extension
 * @param {Object} manifest - Extension manifest
 * @returns {string} Full path to extension entry
 */
export const getExtensionPath = (manifest) => {
    const basePath = getExternalExtensionBasePath();
    const folderName = `awcms-ext-${manifest.vendor}-${manifest.slug}`;
    const entryPath = manifest.entry || 'dist/index.js';
    return `${basePath}/${folderName}/${entryPath}`;
};

/**
 * Load an external extension dynamically
 * @param {Object} manifest - Extension manifest from database
 * @param {string} tenantId - Tenant ID for multi-tenant context
 * @returns {Promise<Object>} Loaded extension module
 */
export const loadExternalExtension = async (manifest, tenantId = null) => {
    const cacheKey = `${manifest.vendor}-${manifest.slug}`;

    // Return cached if available
    if (loadedExtensions.has(cacheKey)) {
        return loadedExtensions.get(cacheKey);
    }

    try {
        // Validate manifest first
        const validation = validateManifest(manifest);
        if (!validation.valid) {
            throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
        }

        // Build path
        const extensionPath = manifest.external_path || getExtensionPath(manifest);

        // Dynamic import
        // Note: Vite requires @vite-ignore for dynamic imports with variables
        const module = await import(/* @vite-ignore */ extensionPath);

        // Validate module exports
        if (!module.default && !module.register) {
            throw new Error('Extension must export a default component or register function');
        }

        // Cache the loaded module with tenant context
        const extensionModule = {
            ...module,
            manifest,
            tenantId,
            loaded: true,
            loadedAt: new Date().toISOString()
        };

        loadedExtensions.set(cacheKey, extensionModule);
        console.log(`[External Extension] Loaded: ${manifest.name} v${manifest.version}`);

        return extensionModule;
    } catch (error) {
        console.error(`[External Extension] Failed to load ${manifest.name}:`, error);

        // Return error placeholder
        return {
            default: () => React.createElement('div', {
                className: 'p-4 border border-red-300 bg-red-50 rounded-lg text-red-700'
            }, [
                React.createElement('h3', { key: 'title', className: 'font-semibold' },
                    `Failed to load extension: ${manifest.name}`
                ),
                React.createElement('p', { key: 'error', className: 'text-sm mt-1' },
                    error.message
                )
            ]),
            manifest,
            loaded: false,
            error: error.message
        };
    }
};

/**
 * Unload an external extension from cache
 * @param {string} vendor - Extension vendor
 * @param {string} slug - Extension slug
 */
export const unloadExternalExtension = (vendor, slug) => {
    const cacheKey = `${vendor}-${slug}`;
    loadedExtensions.delete(cacheKey);
    console.log(`[External Extension] Unloaded: ${vendor}/${slug}`);
};

/**
 * Get all loaded external extensions
 * @returns {Map} Map of loaded extensions
 */
export const getLoadedExtensions = () => loadedExtensions;

/**
 * Clear all loaded extensions from cache
 */
export const clearExtensionCache = () => {
    loadedExtensions.clear();
    console.log('[External Extension] Cache cleared');
};

/**
 * Check if external extension is compatible with current AWCMS version
 * @param {Object} manifest - Extension manifest
 * @param {string} awcmsVersion - Current AWCMS version
 * @returns {boolean} Whether extension is compatible
 */
export const isCompatible = (manifest, awcmsVersion = '2.0.0') => {
    if (!manifest.awcms_version) return true; // No requirement = compatible

    const requirement = manifest.awcms_version;

    // Simple semver comparison for >= requirement
    if (requirement.startsWith('>=')) {
        const minVersion = requirement.slice(2);
        return compareVersions(awcmsVersion, minVersion) >= 0;
    }

    // Exact match
    return awcmsVersion === requirement;
};

/**
 * Simple semver comparison
 * @returns {number} -1 if a < b, 0 if a = b, 1 if a > b
 */
const compareVersions = (a, b) => {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (aParts[i] > bParts[i]) return 1;
        if (aParts[i] < bParts[i]) return -1;
    }
    return 0;
};

const externalExtensionLoader = {
    loadExternalExtension,
    unloadExternalExtension,
    validateManifest,
    getExtensionPath,
    getLoadedExtensions,
    clearExtensionCache,
    isCompatible
};

export default externalExtensionLoader;
