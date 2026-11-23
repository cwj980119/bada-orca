import { app, ipcMain, type BrowserWindow } from 'electron'
import type { Store } from '../../persistence/loading-store/store'
import type { PreQuitCleanupFailureMode, UpdateInstallMode } from './updater-state'

export function ensureAutoUpdaterConfigured(): void {}

type UpdaterSetupHooks = {
  onBeforeUpdateQuit?: () => void | Promise<void>
  onBeforeUpdateQuitFailure?: PreQuitCleanupFailureMode
  updateInstallMode?: UpdateInstallMode
}

export function setupHeadlessServeAutoUpdater(_store: Store, _options: UpdaterSetupHooks): void {}

export function scheduleMainWindowAutoUpdaterSetup(
  _mainWindow: BrowserWindow,
  _store: Store,
  _options?: UpdaterSetupHooks
): void {}

export function registerUpdaterHandlers(_store: Store): void {
  ipcMain.handle('updater:getVersion', () => app.getVersion())
}
