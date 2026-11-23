import { ipcMain } from 'electron'
import type { ClaudeAccountService } from '../../claude-accounts/service'
import type { ClaudeAccountSelectionTarget } from '../../claude-accounts/selection/runtime-selection'
import { openAccountSignInLink } from './account-sign-in-link-opener'
export function registerClaudeAccountHandlers(claudeAccounts: ClaudeAccountService): void {
  claudeAccounts.setWslSignInLinkOpener((signInLink) => openAccountSignInLink('claude', signInLink))
  ipcMain.handle('claudeAccounts:list', () => claudeAccounts.listAccounts())
  ipcMain.handle(
    'claudeAccounts:remove',
    (
      _event,
      args: {
        accountId: string
      }
    ) => claudeAccounts.removeAccount(args.accountId)
  )
  ipcMain.handle(
    'claudeAccounts:rename',
    (
      _event,
      args: {
        accountId: string
        displayName: string | null
      }
    ) => claudeAccounts.renameAccount(args.accountId, args.displayName)
  )
  ipcMain.handle(
    'claudeAccounts:select',
    (
      _event,
      args: {
        accountId: string | null
      } & ClaudeAccountSelectionTarget
    ) =>
      args.runtime
        ? claudeAccounts.selectAccountForTarget(args.accountId, args)
        : claudeAccounts.selectAccount(args.accountId)
  )
}
