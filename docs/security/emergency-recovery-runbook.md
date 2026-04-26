# Emergency Recovery And Rollback Runbook

This runbook covers urgent recovery procedures for the SIKESRA governance and security stack.

Use these steps when an operator, owner, or protected-role user is locked out, cannot complete two-factor authentication, or when a recent security-policy or rollout change needs to be reversed safely.

## Principles

- Prefer the existing admin and service flows over direct database edits.
- Preserve audit history. Recovery actions should still create audit logs and security events where the implementation supports them.
- Avoid destructive shortcuts such as deleting rows manually, resetting passwords in-place in SQL, or removing protection logic from code.
- If a recovery action affects a protected user or a protected role, require a second operator to review the action before execution when possible.

## Prerequisites

- You can access the running application through the reviewed admin browser entry at `https://sikesrakobar.ahlikoding.com/_emdash/`, which redirects into the current admin plugin routes under `/_emdash/admin`.
- You have an administrator account that can complete step-up authentication for protected actions.
- You can deploy a configuration rollback if the incident is caused by a recent code or policy change.
- You know whether the deployment is using the supported Cloudflare proxied hostname and `TRUSTED_PROXY_MODE=cloudflare`.

## Recovery Order

Use this order during incidents:

1. Confirm the user record still exists and is not deleted.
2. Confirm whether the issue is lockout, password-reset requirement, 2FA loss, or a policy rollout problem.
3. Capture the current state before making changes.
4. Apply the smallest recovery action that restores access.
5. Re-test sign-in with the affected account.
6. Document the incident and verify audit entries exist.

## State Capture Checklist

Before intervening, record:

- Affected user id and email
- Current user status: `active`, `disabled`, or `locked`
- Whether `must_reset_password` is set
- Whether mandatory 2FA is currently disabled, `protected_roles`, or `custom`
- Whether the user is in a protected role
- Whether the user has active sessions that should be revoked

## Owner Recovery

Use this when an owner or other protected-role operator cannot regain access normally.

1. Sign in with another administrator account that can perform step-up authentication.
2. Open the affected user's detail page.
3. Check the `Roles` tab and confirm the user still has the expected protected role assignment.
4. If the user forgot the password or is stuck in an invalid credential cycle, force a password reset through the supported password-reset service flow.
5. If the user lost the authenticator device, use the `Security` tab and perform `Reset 2FA` after completing the required typed confirmation and step-up check.
6. In the `Sessions` tab, revoke all existing sessions if compromise is possible or device ownership is uncertain.
7. In `Security Settings`, confirm the current mandatory 2FA rollout mode before asking the user to sign back in.
8. Instruct the owner to sign in, complete any forced password reset, and re-enroll 2FA immediately.

If no secondary admin can perform the protected recovery action, stop and escalate operationally. Do not bypass the step-up requirement by editing session state or removing route checks.

## Lockout Recovery

Use this when login attempts are blocked with the lockout response.

Recovery steps:

1. Verify the lockout from audit logs or from the login response.
2. Check whether the user also needs a password reset.
3. If the user can wait, allow the lockout window to expire naturally.
4. If recovery must be immediate, issue a forced password reset and have the user complete the reset flow.
5. Re-test login after the reset is consumed.

Do not clear lockout state by patching application internals or mutating ad hoc process memory in production.

## Two-Factor Recovery

Use this when the user no longer has a valid TOTP device or usable recovery codes.

1. Open the user's `Security` tab.
2. Confirm whether 2FA is currently enrolled and whether recovery codes remain.
3. Complete step-up authentication with the admin account performing the recovery.
4. Use `Reset 2FA` and provide a clear reason.
5. Revoke active sessions if compromise or device theft is possible.
6. Ask the user to sign in again and complete fresh 2FA enrollment.

Expected system effects of the reset flow:

- Active TOTP credentials are disabled.
- Existing recovery codes are replaced.
- Audit log action `security.2fa.reset` is appended.
- Security event `security.2fa.reset` is appended.

## Password Recovery

Use this when the account password is unknown, expired operationally, or must be rotated immediately.

1. Trigger a forced password reset for the affected user.
2. Confirm the user receives the reset token through the supported recovery handoff or other out-of-band operator-controlled delivery path.
3. Have the user consume the password reset token and set a new password.
4. Confirm all prior sessions are revoked after reset consumption.

Do not set a password directly in the database.

## Rollback Checkpoints

Checkpoint order:

1. Record the current git commit deployed to the environment.
2. Record the current persisted security policy state, especially mandatory 2FA rollout mode and effective role ids.
3. Record whether ABAC audit-only flags are enabled.
4. Record any plugin or admin-surface settings changed during the incident window.
5. Record whether traffic is reaching the app through the supported Cloudflare-hosted runtime path.
6. Record whether the incident coincides with hostname, Turnstile, Worker binding, or R2 bucket automation changes.

## Cloudflare Automation Recovery

Use this when a Cloudflare-side automation change leaves the deployment in a partially applied state.

1. Record the active Worker deployment version before changing anything else.
2. Record which Cloudflare-side resources changed:
   - public hostname mapping (`sikesrakobar.ahlikoding.com`)
   - Turnstile hostname or secret configuration
   - Worker bindings: `MEDIA_BUCKET` → R2 `sikesra`, `HYPERDRIVE` → `sikesra-kobar-postgres-runtime`
3. If the Worker deployment itself is broken, roll back the Worker version first using the reviewed Cloudflare rollback path.
4. If only hostname routing is wrong, correct the custom-domain or route mapping before changing application code.
5. If Turnstile is rejecting valid traffic, restore the last reviewed hostname allowlist or secret configuration.
6. If the R2 binding is missing or points to the wrong bucket, restore the Worker binding contract to `MEDIA_BUCKET` and `sikesra` before changing storage logic.
7. Re-run the Cloudflare smoke tests from `docs/process/cloudflare-hosted-runtime.md` after each rollback step.

## Policy Rollback

Use this when the incident was triggered by mandatory 2FA rollout or staged enforcement changes.

1. Open `Security Settings`.
2. Inspect the current rollout mode.
3. If the rollout is causing widespread access problems, switch to `none` first.
4. If only protected roles should remain enforced, switch to `protected_roles`.
5. If a hand-picked group must remain enforced, switch to `custom` and select only those roles.
6. Save the policy and verify the change in audit logs.

## Authorization Rollback

Use this when authorization denials are newly blocking legitimate work after a rollout.

1. Identify whether the failure is a protected-target deny or a region-scope deny.
2. If the rollout path supports it, enable the relevant ABAC audit-only flag instead of disabling authorization broadly.
3. Re-test the action.
4. Verify that the request is now allowed with reason `ALLOW_ABAC_AUDIT_ONLY`.
5. Open a follow-up issue in `ahliweb/sikesra` to remove the temporary audit-only mode once the policy or data problem is corrected.

## Post-Recovery Verification

After any recovery action:

1. Confirm the affected user can complete the intended sign-in or admin action.
2. Confirm any forced password reset was consumed successfully.
3. Confirm any required 2FA re-enrollment completed.
4. Confirm relevant sessions were revoked.
5. Review `Audit Logs` for the exact recovery actions.
6. Review login security events if the incident involved repeated failures or lockouts.

## Explicitly Avoid

- `git reset --hard` in production recovery workflows
- Direct SQL updates to passwords, TOTP credentials, recovery codes, or role protection state
- Deleting audit or security-event records to "clean up" an incident trail
- Disabling protected-target checks without a tracked rollback decision
- Force-pushing unreviewed hotfixes to bypass governance controls

## VPS Infrastructure Access

Use this when emergency SSH access to the Coolify-managed VPS (`202.10.45.224`) is required.

The reviewed Coolify-managed VPS uses key-only root SSH recovery. Do not store or use a root password from `.env.local` or any script.

`cloudflared` connector recovery:

- If the Cloudflare Tunnel connector for PostgreSQL is inactive, inspect the service status first:

  ```bash
  sudo systemctl status cloudflared-postgres.service
  sudo journalctl -u cloudflared-postgres.service -n 50 --no-pager
  ```

- Do not paste `CLOUDFLARE_TUNNEL_TOKEN` into shell history, issue comments, or any unsecured channel.
- If the token may have been exposed, rotate it through the Cloudflare dashboard and update the server-side secret before restarting the service.
- After restoring the connector, verify the Hyperdrive path is healthy:

  ```bash
  HEALTHCHECK_EXPECT_DATABASE_TRANSPORT=hyperdrive \
  HEALTHCHECK_EXPECT_HYPERDRIVE_BINDING=HYPERDRIVE \
  pnpm healthcheck
  ```

See `docs/process/cloudflare-tunnel-private-db-connector-runbook.md` for the full connector activation and recovery runbook.
