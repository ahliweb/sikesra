/**
 * Extension Registry (Legacy Compatibility Layer)
 * 
 * @deprecated Use pluginRegistry.js instead
 * This file maintains backward compatibility for existing code
 */

import React from 'react';

// Import from new plugins folder
import BackupManager from '@/plugins/backup/BackupManager';
import BackupScheduler from '@/plugins/backup/BackupScheduler';
import BackupSettings from '@/plugins/backup/BackupSettings';
import * as HelloWorld from '@/plugins/helloworld/HelloWorld.jsx';

// Re-export from new registry
export { getPluginComponent as getExtensionComponent, getAvailableComponents } from '@/lib/pluginRegistry';

// Legacy Registry Object (for backward compatibility)
const EXTENSION_COMPONENT_MAP = {
  'BackupManager': BackupManager,
  'BackupScheduler': BackupScheduler,
  'BackupSettings': BackupSettings,
  'AnalyticsDashboard': () => React.createElement('div', { className: "p-8 text-center" }, "Analytics Module Placeholder"),
  'NewsletterBuilder': () => React.createElement('div', { className: "p-8 text-center" }, "Newsletter Module Placeholder"),
  'HelloWorld': HelloWorld,
};

// Legacy API (deprecated)
export const getLegacyComponent = (key) => {
  return EXTENSION_COMPONENT_MAP[key] || (() => React.createElement('div', { className: "p-4 text-red-500" }, `Component "${key}" not found.`));
};
