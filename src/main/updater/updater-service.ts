import type { BrowserWindow } from 'electron'
import type {
  RemoteServerUpdateInstallResult,
  RemoteServerUpdaterSnapshot,
  RemoteServerUpdateSupport
} from '../../shared/remote-runtime/host-catalog/remote-server-update'
import type { ReleaseBuild, ReleaseChannel } from '../../shared/updater/release-channel'
import type {
  LinuxPackageInstallInstructions,
  UpdateCheckOptions,
  UpdateStatus
} from '../../shared/updater/update-status-types'
import type { UpdaterSetupOptions } from './lifecycle/updater-setup'
import type { UpdateInstallMode } from './lifecycle/updater-state'
import type { ReleaseBuildListOptions } from './releases/updater-release-build-cache'

export function resolveUpdateInstallMode(isServeMode: boolean): UpdateInstallMode {
  return isServeMode ? 'unsupported-headless-serve' : 'interactive'
}

export function getUpdateStatus(): UpdateStatus {
  return { state: 'idle' }
}

export function getRemoteServerUpdateSupport(): RemoteServerUpdateSupport {
  return {
    installMode: 'unsupported-headless-serve',
    automatic: false,
    reason: 'updater-unavailable'
  }
}

export function getRemoteServerUpdaterSnapshot(runtimeId: string): RemoteServerUpdaterSnapshot {
  return {
    appVersion: '',
    runtimeId,
    support: getRemoteServerUpdateSupport(),
    status: getUpdateStatus()
  }
}

export function checkForRemoteServerUpdate(
  runtimeId: string,
  _options?: UpdateCheckOptions
): RemoteServerUpdaterSnapshot {
  return getRemoteServerUpdaterSnapshot(runtimeId)
}

export function downloadRemoteServerUpdate(runtimeId: string): RemoteServerUpdaterSnapshot {
  return getRemoteServerUpdaterSnapshot(runtimeId)
}

export function installRemoteServerUpdate(_runtimeId: string): RemoteServerUpdateInstallResult {
  throw new Error('This service is not included in the internal edition.')
}

export function checkForUpdates(): void {}

export function checkForUpdatesFromMenu(_options?: UpdateCheckOptions): void {
  throw new Error('This service is not included in the internal edition.')
}

export function downloadUpdate(): void {
  throw new Error('This service is not included in the internal edition.')
}

export function quitAndInstall(): void {
  throw new Error('This service is not included in the internal edition.')
}

export function isQuittingForUpdate(): boolean {
  return false
}

export async function getLinuxPackageInstallInstructions(): Promise<LinuxPackageInstallInstructions> {
  throw new Error('This service is not included in the internal edition.')
}

export async function showLinuxPackage(): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export async function listAvailableReleaseBuilds(
  _channel: ReleaseChannel,
  _options?: ReleaseBuildListOptions
): Promise<ReleaseBuild[]> {
  return []
}

export function dismissNudge(): void {}

export function dismissAvailableUpdate(): void {}

export function setupAutoUpdater(
  _mainWindow: BrowserWindow | null,
  _opts?: UpdaterSetupOptions
): void {}
