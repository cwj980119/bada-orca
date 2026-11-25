import { webContents } from 'electron'
import type { Store } from '../../../persistence/loading-store/store'
import { browserManager } from '../manager/browser-manager'
import { configureBrowserNetworkExceptions } from './browser-network-exception-prompt'

export function configureBrowserNetworkExceptionSettings(store: Store): void {
  configureBrowserNetworkExceptions({
    readSettings: () => store.getSettings().intranet,
    saveSettings: (intranet) => {
      store.updateSettings({ intranet })
    },
    resolveRequester: (id) => webContents.fromId(id) ?? null,
    resolveTarget: (requester) => browserManager.resolvePagePromptTarget(requester)
  })
}
