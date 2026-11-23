import { expect, it, vi } from 'vitest'
import { intranetModelDiscovery } from './intranet-model-catalog'
import { intranetAgentEnvironment } from '../../shared/intranet/intranet-agent-environment'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

it('offers the model from the original Claude settings without starting CLI discovery', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orca-claude-catalog-'))
  try {
    await writeFile(
      join(directory, 'settings.json'),
      JSON.stringify({
        model: 'company-from-file',
        env: { ANTHROPIC_AUTH_TOKEN: 'fixture-private-auth' }
      })
    )
    const discovery = intranetModelDiscovery(
      'claude',
      { deps: {} },
      {
        kind: 'probe',
        listingNamesConfiguredModel: true,
        probe: async () => {
          throw new Error('Unexpected CLI discovery')
        }
      }
    )
    if (discovery.kind !== 'probe') {
      throw new Error('Expected local configuration discovery')
    }
    const result = await discovery.probe({ variable: 'CLAUDE_CONFIG_DIR', path: directory })
    expect(result.configured).toEqual({ model: 'company-from-file' })
    expect(result.models.map(({ id }) => id)).toEqual(['company-from-file'])
    expect(JSON.stringify(result)).not.toContain('fixture-private-auth')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('lists registered Codex models and never probes the CLI account catalog', async () => {
  const settings = defaultIntranetSettings()
  settings.cliModels = {
    codex: {
      model: 'company-coder',
      models: [{ id: 'company-coder', name: 'Coder', purpose: 'Code' }]
    }
  }
  let env = intranetAgentEnvironment('codex', settings, {})
  const probe = vi.fn().mockRejectedValue(new Error('Account probe must not run'))
  const discovery = intranetModelDiscovery(
    'codex',
    { deps: { resolveAgentLaunchEnv: () => env } },
    { kind: 'probe', probe, listingNamesConfiguredModel: true }
  )
  if (discovery.kind !== 'probe') {
    throw new Error('Expected probe')
  }
  const home = { variable: 'CODEX_HOME', path: '/company/codex' }
  expect(
    (await discovery.probe(home)).models.map(({ id, isDefault }) => ({ id, isDefault }))
  ).toEqual([{ id: 'company-coder', isDefault: true }])
  env = {}
  expect((await discovery.probe(home)).models).toEqual([])
})

it.each(['claude', 'opencode', 'opencode2'])(
  'uses the installed %s catalog unless company models are configured',
  async (agent) => {
    let env: Record<string, string> = {}
    const discovery = intranetModelDiscovery(
      agent,
      {
        deps: { resolveAgentLaunchEnv: () => env }
      },
      {
        kind: 'probe',
        listingNamesConfiguredModel: true,
        probe: async (_home, options) => ({
          origin: 'probe',
          complete: true,
          configured: { model: options?.cwd === '/project' ? 'company/cli-default' : undefined },
          models: [{ id: 'company/cli-default', label: 'CLI model', isDefault: true, efforts: [] }]
        })
      }
    )
    if (discovery.kind !== 'probe') {
      throw new Error('Expected installed CLI discovery')
    }
    const home = { variable: 'CLAUDE_CONFIG_DIR', path: '/company/cli' }
    const result = await discovery.probe(home, { cwd: '/project' })
    expect(result.configured).toEqual({ model: 'company/cli-default' })
    expect(result.models.map(({ id }) => id)).toEqual(['company/cli-default'])
    env = intranetAgentEnvironment(
      agent,
      {
        ...defaultIntranetSettings(),
        claude: { baseUrl: '', model: 'company-override' },
        opencode: {
          ...defaultIntranetSettings().opencode,
          model: 'company/override',
          models: [{ id: 'company/override', name: '', purpose: '' }]
        }
      },
      {}
    )
    expect((await discovery.probe(home)).models.map(({ id }) => id)).toEqual([
      agent === 'claude' ? 'company/cli-default' : 'company/override'
    ])
  }
)

it('offers every registered model with its purpose and default selection', async () => {
  const env = intranetAgentEnvironment(
    'opencode',
    {
      allowedHosts: [],
      opencode: {
        baseUrl: 'http://10.1.2.3/v1',
        model: 'review',
        configVersion: 'v1',
        models: [
          { id: 'code', name: 'Coder', purpose: 'Implementation' },
          { id: 'review', name: 'Reasoner', purpose: 'Review' }
        ]
      },
      claude: { baseUrl: '', model: '' }
    },
    {}
  )
  const discovery = intranetModelDiscovery(
    'opencode',
    { deps: { resolveAgentLaunchEnv: () => env } },
    { kind: 'unavailable', reason: 'Not installed' }
  )
  if (discovery.kind !== 'probe') {
    throw new Error('Expected model picker catalog')
  }
  const result = await discovery.probe({ kind: 'opencode', locator: { kind: 'unmanaged' } })
  expect(result.models.map(({ id, label, isDefault }) => ({ id, label, isDefault }))).toEqual([
    { id: 'internal/code', label: 'Coder · Implementation', isDefault: false },
    { id: 'internal/review', label: 'Reasoner · Review', isDefault: true }
  ])
})

it('reads changed and cleared model settings without rebuilding the runtime', async () => {
  let env: Record<string, string> = { ANTHROPIC_MODEL: 'company-a' }
  const context = {
    deps: { resolveAgentLaunchEnv: () => env }
  }
  const discovery = intranetModelDiscovery('claude', context, {
    kind: 'unavailable',
    reason: 'CLI not installed'
  })
  if (discovery.kind !== 'probe') {
    throw new Error('Expected configured discovery')
  }
  const home = { variable: 'CLAUDE_CONFIG_DIR', path: '/company/claude' }
  expect((await discovery.probe(home)).models[0].id).toBe('company-a')
  env = { ANTHROPIC_MODEL: 'company-b' }
  expect((await discovery.probe(home)).models[0].id).toBe('company-b')
  env = {}
  expect((await discovery.probe(home)).models).toEqual([])
})
