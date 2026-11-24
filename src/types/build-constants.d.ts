// CI release builds substitute telemetry credentials; contributor builds use null and console-mirror only.
// No runtime env fallback: shell exports must not enable telemetry transmission.

// CI supplies the diagnostics token endpoint; null disables upload in contributor builds.
// ORCA_DIAGNOSTICS_TOKEN_URL overrides it for developers testing packaged builds against staging.

// Full commit the build was made from (`git rev-parse HEAD`); official skill installs pin to it.
declare const ORCA_BUILD_COMMIT: string
declare const BADA_CLIENT_ID: string
declare const BADA_CLIENT_SECRET: string

// ORCA_LAYOUT_OWNER is declared and read in one place: src/shared/workspace-layout/layout-owner-switch.ts.
