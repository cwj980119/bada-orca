import type { OrcaRuntimeService } from '../runtime/orca-runtime'
import type { IntranetSsoService } from './intranet-sso-service'

const services = new WeakMap<OrcaRuntimeService, IntranetSsoService>()
export function registerRuntimeIntranetSso(
  runtime: OrcaRuntimeService,
  service: IntranetSsoService
): void {
  services.set(runtime, service)
}
export function runtimeIntranetSso(runtime: OrcaRuntimeService): IntranetSsoService {
  const service = services.get(runtime)
  if (!service) {
    throw new Error('Company sign-in is available in the desktop app.')
  }
  return service
}
