# AWCMS-Micro Changesets

This directory stores AWCMS-Micro-only release note entries for versioning plugins and templates under the `@awcms-micro/*` namespace.

Do not use it for workspace package releases such as `@emdash-cms/admin`; those continue to use the standard `awcmsmicro-dev/.changeset/` boundary.

## File Format

Each changeset is a Markdown file with frontmatter listing one or more affected packages and the bump type.

Example:

```md
---
"@awcms-micro/plugin-sikesra": minor
"@awcms-micro/template-default-example": patch
---

Adds plugin-owned navigation exports for template consumption and updates the example template guidance.
```

## Supported Bumps

- `patch`
- `minor`
- `major`

## Processing Rule

The AWCMS versioning workflow consumes these files, updates package versions, prepends `CHANGELOG.md` entries for affected packages, and removes processed changeset files in the generated version PR.
