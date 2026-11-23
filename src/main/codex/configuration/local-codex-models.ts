import { join } from 'node:path'
import { parse as parseToml } from 'smol-toml'
import { readNodeFileWithinLimit } from '../../../shared/file-content/node-bounded-file-reader'
import type {
  LocalCodexModels,
  LocalCodexModel
} from '../../../shared/intranet/intranet-codex-models'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function modelId(value: unknown): string | null {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= 512 &&
    !/[\r\n\0]/.test(value)
    ? value.trim()
    : null
}

async function readDocument(
  home: string,
  file: string,
  parse: (text: string) => unknown,
  maxBytes: number,
  issues: LocalCodexModels['issues'],
  issue: LocalCodexModels['issues'][number]
): Promise<Record<string, unknown>> {
  try {
    const { buffer } = await readNodeFileWithinLimit(join(home, file), maxBytes, {
      regularFileOnly: true
    })
    return record(parse(buffer.toString('utf8')))
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      issues.push(issue)
    }
    return {}
  }
}

export async function readLocalCodexModels(home: string): Promise<LocalCodexModels> {
  const issues: LocalCodexModels['issues'] = []
  const config = await readDocument(
    home,
    'config.toml',
    parseToml,
    4 * 1024 * 1024,
    issues,
    'configuration-unreadable'
  )
  const profiles = record(config.profiles)
  const active = record(typeof config.profile === 'string' ? profiles[config.profile] : undefined)
  const provider = modelId(active.model_provider) ?? modelId(config.model_provider) ?? 'openai'
  const defaultModel = modelId(active.model) ?? modelId(config.model)
  const models = new Map<string, LocalCodexModel>()
  const add = (id: string | null, source: LocalCodexModel['source'], name = ''): void => {
    if (id && !models.has(id) && models.size < 256) {
      models.set(id, { id, name, source })
    }
  }
  add(defaultModel, 'configuration')
  if ((modelId(config.model_provider) ?? 'openai') === provider) {
    add(modelId(config.model), 'configuration')
  }
  for (const value of Object.values(profiles)) {
    const profile = record(value)
    if (
      (modelId(profile.model_provider) ?? modelId(config.model_provider) ?? 'openai') === provider
    ) {
      add(modelId(profile.model), 'configuration')
    }
  }
  let cacheUpdatedAt: string | null = null
  const customProvider = record(record(config.model_providers)[provider])
  if (provider === 'openai' && Object.keys(customProvider).length === 0) {
    const cache = await readDocument(
      home,
      'models_cache.json',
      JSON.parse,
      16 * 1024 * 1024,
      issues,
      'cache-unreadable'
    )
    if (typeof cache.fetched_at === 'string') {
      cacheUpdatedAt = cache.fetched_at.slice(0, 128)
    }
    if (Array.isArray(cache.models)) {
      for (const value of cache.models) {
        const row = record(value)
        if (row.visibility === 'hide' || row.visibility === 'hidden') {
          continue
        }
        const id = modelId(row.slug) ?? modelId(row.id)
        const name =
          typeof row.display_name === 'string' ? row.display_name.trim().slice(0, 128) : ''
        add(id, 'cache', name)
      }
    }
  } else {
    issues.push('provider-cache-skipped')
  }
  return { models: [...models.values()], defaultModel, cacheUpdatedAt, issues }
}
