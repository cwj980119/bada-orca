import { ipcMain } from 'electron'
import type { CodexAccountService } from '../../codex-accounts/service'

import type { CodexAccountSelectionTarget } from '../../../shared/agent-accounts/codex/codex-selection-lane'

import { listRecordedCodexPaneLanes } from '../../codex/configuration/homes/codex-pane-account-registry'
import {
  forgetStaleCodexPanes,
  listStaleCodexPanes
} from '../../codex/configuration/homes/codex-stale-pane-accounts'
import type { GlobalSettings } from '../../../shared/settings/global-settings-types'
export function registerCodexAccountHandlers(
  codexAccounts: CodexAccountService,
  getSettings?: () => GlobalSettings
): void {
  ipcMain.handle(
    'codexAccounts:listStalePanes',
    (
      _event,
      args: {
        ptyIds?: unknown
      }
    ) => {
      const settings = getSettings?.()
      if (!settings || !Array.isArray(args?.ptyIds)) {
        return []
      }
      return listStaleCodexPanes({
        ptyIds: args.ptyIds.filter((ptyId): ptyId is string => typeof ptyId === 'string'),
        settings
      })
    }
  )
  ipcMain.handle(
    'codexAccounts:listRecordedPaneLanes',
    (
      _event,
      args: {
        ptyIds?: unknown
      }
    ) => {
      if (!Array.isArray(args?.ptyIds)) {
        return {}
      }
      return listRecordedCodexPaneLanes(
        args.ptyIds.filter((ptyId): ptyId is string => typeof ptyId === 'string')
      )
    }
  )
  ipcMain.handle(
    'codexAccounts:forgetStalePanes',
    (
      _event,
      args: {
        ptyIds?: unknown
      }
    ) => {
      if (!Array.isArray(args?.ptyIds)) {
        return
      }
      forgetStaleCodexPanes(
        args.ptyIds.filter((ptyId): ptyId is string => typeof ptyId === 'string')
      )
    }
  )
  ipcMain.handle('codexAccounts:list', () => codexAccounts.listAccounts())
  ipcMain.handle(
    'codexAccounts:remove',
    (
      _event,
      args: {
        accountId: string
      }
    ) => codexAccounts.removeAccount(args.accountId)
  )
  ipcMain.handle(
    'codexAccounts:rename',
    (
      _event,
      args: {
        accountId: string
        displayName: string | null
      }
    ) => codexAccounts.renameAccount(args.accountId, args.displayName)
  )
  ipcMain.handle(
    'codexAccounts:select',
    (
      _event,
      args: {
        accountId: string | null
      } & CodexAccountSelectionTarget
    ) => {
      if (!args.runtime) {
        // Legacy renderers omit runtime; infer it from the account so valid WSL selection still works.
        return codexAccounts.selectAccount(args.accountId)
      }
      return codexAccounts.selectAccountForTarget(args.accountId, args)
    }
  )
}
