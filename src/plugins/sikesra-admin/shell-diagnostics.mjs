export const SIKESRA_SHELL_AUTH_STATES = Object.freeze({
  pre_auth_setup_ready: "pre_auth_setup_ready",
  pre_auth_setup_blocked: "pre_auth_setup_blocked",
  post_auth_ready: "post_auth_ready",
  unknown: "unknown",
});

export function evaluateSikesraShellDiagnostics(input = {}) {
  const setupStatusCode = normalizeStatusCode(input.setupStatusCode);
  const manifestStatusCode = normalizeStatusCode(input.manifestStatusCode);

  const setupReady = setupStatusCode === 200;
  const manifestNotAuthenticated = manifestStatusCode === 401;
  const manifestAvailable = manifestStatusCode === 200;

  if (setupReady && manifestNotAuthenticated) {
    return {
      state: SIKESRA_SHELL_AUTH_STATES.pre_auth_setup_ready,
      setupReady: true,
      manifestReady: false,
      shouldRenderShell: false,
      expectedPreAuthManifest401: true,
      note:
        "Setup runtime is ready. Unauthenticated manifest response is expected before login and should not be treated as a runtime failure.",
    };
  }

  if (setupReady && manifestAvailable) {
    return {
      state: SIKESRA_SHELL_AUTH_STATES.post_auth_ready,
      setupReady: true,
      manifestReady: true,
      shouldRenderShell: true,
      expectedPreAuthManifest401: false,
      note: "Setup runtime and manifest are available. Post-auth shell can be rendered.",
    };
  }

  if (!setupReady) {
    return {
      state: SIKESRA_SHELL_AUTH_STATES.pre_auth_setup_blocked,
      setupReady: false,
      manifestReady: manifestAvailable,
      shouldRenderShell: false,
      expectedPreAuthManifest401: manifestNotAuthenticated,
      note: "Setup runtime is not ready yet. Verify setup status before treating shell as healthy.",
    };
  }

  return {
    state: SIKESRA_SHELL_AUTH_STATES.unknown,
    setupReady,
    manifestReady: manifestAvailable,
    shouldRenderShell: manifestAvailable,
    expectedPreAuthManifest401: manifestNotAuthenticated,
    note: "Shell diagnostics are inconclusive. Re-check setup and manifest transitions.",
  };
}

function normalizeStatusCode(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}
