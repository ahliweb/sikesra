# Admin Operations Guide

## EmDash Core Vs Mini Overlay

### EmDash Core

EmDash provides the admin shell and plugin-hosted admin entrypoints.

### Mini Overlay

Mini extends the admin with governance and security operating surfaces.

## Current Governance Pages

The `awcms-users-admin` plugin currently exposes:

- Users
- Roles
- Logical Regions
- Administrative Regions
- Audit Logs
- Security Settings
- Job Levels
- Job Titles
- Permissions Matrix

## User Detail Tabs

The user detail surface is organized into:

- Overview
- Roles
- Jobs
- Logical Regions
- Administrative Regions
- Sessions
- Security

## High-Risk Action Rules

Operators should expect explicit confirmation or step-up requirements for:

- disabling or locking users
- revoking sessions
- resetting 2FA
- other protected actions

## Operational Use

Use the admin plugin for:

- lifecycle interventions
- role assignment
- job assignment
- region assignment
- session review and revocation
- security-policy rollout changes
- audit review

Use the dedicated runbooks and checklists for:

- incident recovery
- deployment validation

## SIKESRA Admin Entry

The EmDash admin surface for SIKESRA is at:

- `https://sikesrakobar.ahlikoding.com/_emdash/`

This redirects to `/_emdash/admin` on the same host.

First-run setup (when `needsSetup=true`):

- `https://sikesrakobar.ahlikoding.com/_emdash/admin/setup`

## Module Label Note

The general religious teacher module is labeled `Guru Agama` in SIKESRA, not `Guru Ngaji`. Use this label consistently in UI copy, routes, and data.

## Cross-References

- `docs/security/emergency-recovery-runbook.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/cloudflare-hosted-runtime.md`
