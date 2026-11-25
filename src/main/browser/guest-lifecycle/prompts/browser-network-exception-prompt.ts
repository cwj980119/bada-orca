import { intranetRequestAllowed } from '../../../network/intranet-network'
import {
  readIntranetSettings,
  type IntranetSettings
} from '../../../../shared/intranet/intranet-settings'
import { openBrowserPagePrompt, type BrowserPagePromptTarget } from './browser-page-prompts'

type NetworkExceptionDependencies = {
  readSettings: () => unknown
  saveSettings: (settings: IntranetSettings) => void
  resolveRequester: (id: number) => Electron.WebContents | null
  resolveTarget: (requester: Electron.WebContents) => BrowserPagePromptTarget | null
}

let dependencies: NetworkExceptionDependencies | null = null

export function configureBrowserNetworkExceptions(next: NetworkExceptionDependencies | null): void {
  dependencies = next
}

export function requestBrowserNetworkException(
  session: Electron.Session,
  details: Electron.OnBeforeRequestListenerDetails,
  isCurrent: () => boolean
): false | Promise<boolean> {
  const authority = dependencies
  if (!authority) {
    return false
  }
  const requester =
    details.webContents ??
    (details.webContentsId === undefined ? null : authority.resolveRequester(details.webContentsId))
  if (!requester || requester.isDestroyed() || requester.session !== session) {
    return false
  }
  let destination: URL
  try {
    destination = new URL(details.url)
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(destination.protocol)) {
      return false
    }
  } catch {
    return false
  }
  const hostname = destination.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')
  return new Promise((resolve) => {
    const opening = openBrowserPagePrompt({
      kind: 'network-exception',
      requester,
      target: authority.resolveTarget(requester),
      details: () => ({ origin: destination.origin, hostname }),
      coalesceKey: hostname,
      parseAnswer: (value) => (value === 'allow' ? 'allow' : undefined),
      settle: (answer): void | 'failed' => {
        if (
          answer !== 'allow' ||
          dependencies !== authority ||
          requester.isDestroyed() ||
          !isCurrent()
        ) {
          resolve(false)
          return
        }
        try {
          const settings = readIntranetSettings(authority.readSettings())
          if (!intranetRequestAllowed(details.url)) {
            authority.saveSettings({
              ...settings,
              allowedHosts: [...new Set([...settings.allowedHosts, hostname])]
            })
          }
          resolve(intranetRequestAllowed(details.url))
        } catch (error) {
          console.warn('[browser] Could not save network exception:', error)
          resolve(false)
          return 'failed'
        }
      }
    })
    if (opening !== 'prompting') {
      resolve(false)
    }
  })
}
