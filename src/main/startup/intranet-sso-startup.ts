import { app, shell } from 'electron'
import { join } from 'node:path'
import { badaSsoSettings } from '../../shared/intranet/intranet-sso'
import { IntranetSsoService } from '../intranet-sso/intranet-sso-service'
import { IntranetSsoSessionFile } from '../intranet-sso/intranet-sso-session'
import { registerRuntimeIntranetSso } from '../intranet-sso/runtime-intranet-sso'
import { getCanonicalUserDataPath } from '../persistence/loading-store/user-data-path'
import type { OrcaRuntimeService } from '../runtime/orca-runtime'

export function installDesktopIntranetSso(runtime: OrcaRuntimeService): void {
  const store = runtime.requireStore()
  const service = new IntranetSsoService({
    settings: () => badaSsoSettings(store.getSettings().intranet?.sso),
    openBrowser: (url) => shell.openExternal(url),
    session: new IntranetSsoSessionFile(
      join(getCanonicalUserDataPath(), 'intranet-sso-session.enc')
    )
  })
  registerRuntimeIntranetSso(runtime, service)
  const stop = store.onSettingsChanged?.(() => service.status())
  app.once('will-quit', () => {
    service.cancel()
    stop?.()
  })
}
