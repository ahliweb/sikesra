# Plugin Permission Registration

Plugins should declare permissions through the plugin definition and descriptor `permissions` arrays so plugin-defined capabilities can be normalized into the same catalog shape as core permissions.

## Contract

Each plugin permission declaration should include:

- `code`: canonical permission code such as `sample.widgets.read`
- `domain`: top-level governance domain such as `sample` or `security`
- `resource`: governed resource such as `widgets`
- `action`: action verb such as `read`, `update`, or `revoke`
- `description`: optional operator-facing description
- `is_protected`: optional boolean for high-risk permissions
- `id`: optional explicit catalog id; if omitted a deterministic plugin-scoped id is derived

## Example

```js
import { collectRegisteredPluginPermissions } from "../../src/plugins/permission-registration.mjs";
import { definePlugin } from "emdash";

const SAMPLE_PLUGIN_PERMISSIONS = collectRegisteredPluginPermissions([
  {
    id: "sample-plugin",
    permissions: [
      {
        code: "sample.widgets.read",
        domain: "sample",
        resource: "widgets",
        action: "read",
        description: "Inspect sample widgets.",
      },
      {
        code: "sample.widgets.update",
        domain: "sample",
        resource: "widgets",
        action: "update",
        description: "Update sample widgets.",
        is_protected: true,
      },
    ],
  },
]);

export function createPlugin() {
  return definePlugin({
    id: "sample-plugin",
    version: "0.1.0",
    permissions: SAMPLE_PLUGIN_PERMISSIONS,
    routes: {},
  });
}
```

The same normalized permission array should be reused by the plugin definition and the plugin descriptor so route guards and host registration stay aligned.

## Normalized Shape

Registered plugin permissions normalize to the same catalog fields used by core permissions:

- `id`
- `code`
- `domain`
- `resource`
- `action`
- `description`
- `is_protected`
- `created_at`

The helper also adds `plugin_id` so later contract layers can trace where the declaration originated.

## Rules

- Permission codes must be unique across all registered plugins.
- Every declaration must provide non-empty `code`, `domain`, `resource`, and `action` values.
- Plugins should treat this manifest as the source of truth for route guards, service authorization, and audit helpers added in later contract steps.
- Plugin permissions should remain additive overlays on top of EmDash host conventions, not a second permission system.
