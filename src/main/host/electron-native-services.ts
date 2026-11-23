import { app, ipcMain, powerMonitor, session, shell } from 'electron'
import { assertIntranetRequest } from '../network/intranet-network'
import { installElectronProxyRequestGuard } from '../network/electron-proxy-request-guard'
import { setPtyHostBindings } from '../ipc/pty/pty-host-bindings'
import { electronRuntimeDesktopSurface } from './electron-runtime-desktop-surface'
import { setRuntimeDesktopSurface } from '../runtime/construction/runtime-desktop-surface'
import { installElectronBrowserCommands } from './electron-browser-commands'
import { electronHttpClient } from './electron-http-client'
import { setMainHttpClient } from '../network/http-client'
import { setWorktreeWatcherRemoval } from '../workspaces/removal/worktree-watcher-removal'
import { desktopWorktreeWatcherRemoval } from '../ipc/filesystem/watchers/filesystem-watcher'
import { setDefaultProxySessionResolver } from '../network/electron-default-proxy-session'
import {
  installElectronHeavyWorkerHost,
  installElectronJournalReaderHost
} from './electron-utility-worker-hosts'

export function installElectronNativeServices(): void {
  const openExternal = shell.openExternal.bind(shell)
  shell.openExternal = (url, options) => {
    assertIntranetRequest(url)
    return openExternal(url, options)
  }
  app.on('session-created', (created) => {
    created.setSpellCheckerEnabled(false)
    installElectronProxyRequestGuard(created)
  })
  // Bind PTY IPC/power at process scope: headless serve has no window yet and must not register no-op handlers.
  setPtyHostBindings({ ipc: ipcMain, power: powerMonitor })
  // Node hosts omit desktop surfaces and route notifications to paired clients instead.
  setRuntimeDesktopSurface(electronRuntimeDesktopSurface)
  // Install Chromium browser commands only in Electron; Node hosts advertise no browser capability and reject those RPCs.
  installElectronBrowserCommands()
  // Electron consults default-session proxy config; Node hosts use environment only.
  setDefaultProxySessionResolver(() => session.defaultSession)
  // Desktop integrations use Chromium networking; Node differs in proxy environment and user agent.
  setMainHttpClient(electronHttpClient)
  setWorktreeWatcherRemoval(desktopWorktreeWatcherRemoval)
  installElectronJournalReaderHost()
  installElectronHeavyWorkerHost()
}
