import { app, shell } from 'electron'
import { join } from 'node:path'
import { badaBuildSettings, badaBuildClientSecret } from '../intranet-sso/bada-build-configuration'
import { IntranetSsoService } from '../intranet-sso/intranet-sso-service'
import { IntranetSsoSessionFile } from '../intranet-sso/intranet-sso-session'
import { registerRuntimeIntranetSso } from '../intranet-sso/runtime-intranet-sso'
import { getCanonicalUserDataPath } from '../persistence/loading-store/user-data-path'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'
import { readIntranetSettings } from '../../shared/intranet/intranet-settings'

export function installDesktopIntranetSso(runtime: OrcaRuntimeService): void {
  const settings = () =>
    readIntranetSettings(runtime.getClientSettings().intranet).sso ?? badaBuildSettings()
  const service = new IntranetSsoService({
    settings,
    clientSecret: () => {
      const config = settings()
      const built = badaBuildSettings()
      return config.issuer === built.issuer && config.clientId === built.clientId
        ? badaBuildClientSecret()
        : ''
    },
    openBrowser: (url) => shell.openExternal(url),
    session: new IntranetSsoSessionFile(
      join(getCanonicalUserDataPath(), 'intranet-sso-session.enc')
    )
  })
  const stop = registerRuntimeIntranetSso(runtime, service)
  void service.ensureFresh()
  app.once('will-quit', () => {
    service.cancel()
    stop()
  })
}
