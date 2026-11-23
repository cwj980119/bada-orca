import type {
  PluginKillList,
  PluginKillListEntry
} from '../../../shared/plugins/catalog/plugin-kill-list'
import type { PluginKillListStore } from './plugin-kill-list-store'

export const PLUGIN_KILL_LIST_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000

export const PLUGIN_KILL_LIST_RETRY_MS = 15 * 60 * 1000

type PluginKillListFetcher = () => Promise<PluginKillList>

export class PluginKillListService {
  constructor(_options: {
    pluginsDataDir: string
    store?: PluginKillListStore
    fetcher?: PluginKillListFetcher
  }) {}

  onChanged(_listener: () => void): () => void {
    return () => {}
  }

  find(_pluginKey: string): PluginKillListEntry | null {
    return null
  }

  reason(_pluginKey: string): string | null {
    return null
  }

  snapshot(): PluginKillList | null {
    return null
  }

  refresh(): Promise<PluginKillList> {
    return Promise.resolve({ version: 1, generatedAt: new Date(0).toISOString(), plugins: [] })
  }

  syncPeriodicRefresh(
    _enabled: boolean,
    _intervalMs = PLUGIN_KILL_LIST_REFRESH_INTERVAL_MS
  ): void {}

  dispose(): void {}
}

export async function fetchPluginKillList(
  _fetcher: typeof fetch = fetch,
  _url = ''
): Promise<PluginKillList> {
  throw new Error('This service is not included in the internal edition.')
}
