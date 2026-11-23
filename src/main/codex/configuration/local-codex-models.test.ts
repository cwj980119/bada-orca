import { afterEach, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readLocalCodexModels } from './local-codex-models'

const homes: string[] = []
async function home(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), 'orca-local-models-'))
  homes.push(value)
  return value
}
afterEach(async () => {
  await Promise.all(homes.splice(0).map((value) => rm(value, { recursive: true, force: true })))
})

it('reads default, compatible profiles and cached models without returning credentials or hidden models', async () => {
  const directory = await home()
  await writeFile(
    join(directory, 'config.toml'),
    'model = "coder"\napi_key = "secret-from-config"\n[profiles.review]\nmodel = "reviewer"\n'
  )
  await writeFile(join(directory, 'auth.json'), '{"api_key":"secret-from-auth"}')
  await writeFile(
    join(directory, 'models_cache.json'),
    JSON.stringify({
      fetched_at: '2026-11-22T00:00:00Z',
      identity: 'secret-identity',
      models: [
        { slug: 'coder', display_name: 'Coder' },
        { slug: 'fast', display_name: 'Fast' },
        { slug: 'retired', visibility: 'hide' }
      ]
    })
  )
  const result = await readLocalCodexModels(directory)
  expect(result.defaultModel).toBe('coder')
  expect(result.models).toEqual([
    { id: 'coder', name: '', source: 'configuration' },
    { id: 'reviewer', name: '', source: 'configuration' },
    { id: 'fast', name: 'Fast', source: 'cache' }
  ])
  expect(JSON.stringify(result)).not.toContain('secret-')
})

it.each(['company', 'openai'])(
  'does not mix another provider’s profiles or account cache into a custom %s provider',
  async (provider) => {
    const directory = await home()
    await writeFile(
      join(directory, 'config.toml'),
      `model_provider = "${provider}"\nmodel = "company-coder"\n[model_providers.${provider}]\nbase_url = "http://10.20.0.8/v1"\n[profiles.review]\nmodel = "company-review"\n[profiles.other]\nmodel_provider = "other"\nmodel = "unrelated"\n`
    )
    await writeFile(join(directory, 'models_cache.json'), '{"models":[{"slug":"public-cached"}]}')
    const result = await readLocalCodexModels(directory)
    expect(result.models.map((model) => model.id)).toEqual(['company-coder', 'company-review'])
    expect(result.issues).toEqual(['provider-cache-skipped'])
  }
)

it('keeps cached candidates when configuration is malformed, without claiming a configured default', async () => {
  const directory = await home()
  await writeFile(join(directory, 'config.toml'), 'model = [invalid')
  await writeFile(
    join(directory, 'models_cache.json'),
    '{"models":[{"slug":"cached","display_name":"Cached"}]}'
  )
  const result = await readLocalCodexModels(directory)
  expect(result.defaultModel).toBeNull()
  expect(result.models).toEqual([{ id: 'cached', name: 'Cached', source: 'cache' }])
  expect(result.issues).toEqual(['configuration-unreadable'])
})
