import type { PluginInstallStats } from '../../../shared/plugins/catalog/plugin-install-stats'

export const PLUGIN_INSTALL_STATS_REFRESH_MS = 6 * 60 * 60 * 1000
export const PLUGIN_INSTALL_STATS_RETRY_MS = 15 * 60 * 1000

type PluginInstallStatsFetcher = () => Promise<PluginInstallStats>

export class PluginInstallStatsService {
  constructor(_options: {
    pluginsDataDir: string
    isFetchAllowed: () => boolean
    fetcher?: PluginInstallStatsFetcher
    now?: () => number
  }) {}

  onChanged(_listener: () => void): () => void {
    return () => {}
  }

  async getInstallCounts(): Promise<Record<string, number>> {
    return {}
  }

  async settled(): Promise<void> {}
}

export async function fetchPluginInstallStats(
  _fetcher: typeof fetch = fetch,
  _url = ''
): Promise<PluginInstallStats> {
  throw new Error('This service is not included in the internal edition.')
}
