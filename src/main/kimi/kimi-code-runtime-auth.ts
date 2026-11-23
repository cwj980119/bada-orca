export type KimiCodeRuntimeAuth = {
  tokenName: string
  usageUrl: string
}

export function resolveKimiCodeRuntimeAuth(
  _configToml: string,
  _env: NodeJS.ProcessEnv = process.env
): KimiCodeRuntimeAuth {
  throw new Error('This service is not included in the internal edition.')
}
