import type { OrcaRuntimeService } from '../runtime/orca-runtime'
import type { IntranetSsoService } from './intranet-sso-service'
import { badaCredentialsFromEnvironment } from '../../shared/intranet/bada-agent-credentials'

const services = new WeakMap<OrcaRuntimeService, IntranetSsoService>()
let desktopService: IntranetSsoService | null = null
export function registerRuntimeIntranetSso(
  runtime: OrcaRuntimeService,
  service: IntranetSsoService
): () => void {
  services.set(runtime, service)
  desktopService = service
  return () => {
    services.delete(runtime)
    if (desktopService === service) {
      desktopService = null
    }
  }
}

export function withBadaAgentEnvironment(
  environment: Readonly<Record<string, string>>
): Record<string, string> {
  const result = Object.fromEntries(
    Object.entries(environment).filter(([key]) => !key.toUpperCase().startsWith('ORCA_BADA_'))
  )
  const credentials = desktopService
    ? desktopService.credentials()
    : badaCredentialsFromEnvironment({ ...process.env, ...environment })
  if (!credentials) {
    return result
  }
  return {
    ...result,
    ORCA_BADA_NAME: credentials.name ?? '',
    ORCA_BADA_EMAIL: credentials.email ?? '',
    ORCA_BADA_SUBJECT: credentials.subject,
    ORCA_BADA_ACCESS_TOKEN: credentials.accessToken,
    ...(credentials.idToken ? { ORCA_BADA_ID_TOKEN: credentials.idToken } : {}),
    ORCA_BADA_TOKEN_EXPIRES_AT: String(credentials.expiresAt)
  }
}
export function runtimeIntranetSso(runtime: OrcaRuntimeService): IntranetSsoService {
  const service = services.get(runtime)
  if (!service) {
    throw new Error('Company sign-in is available in the desktop app.')
  }
  return service
}
