export type LocalCodexModel = {
  id: string
  name: string
  source: 'configuration' | 'cache'
}

export type LocalCodexModels = {
  models: LocalCodexModel[]
  defaultModel: string | null
  cacheUpdatedAt: string | null
  issues: ('configuration-unreadable' | 'cache-unreadable' | 'provider-cache-skipped')[]
}
