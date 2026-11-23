export function resolveArtifactCloudApiUrl(
  _override?: string,
  _env: NodeJS.ProcessEnv = process.env,
  _packaged = false
): string {
  throw new Error('This service is not included in the internal edition.')
}

export function allowsArtifactCloudAuthOverride(
  _env: NodeJS.ProcessEnv = process.env,
  _packaged = false
): boolean {
  throw new Error('This service is not included in the internal edition.')
}
