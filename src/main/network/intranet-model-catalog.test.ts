import { expect, it, vi } from 'vitest'
import { intranetModelDiscovery } from './intranet-model-catalog'
import { intranetAgentEnvironment } from '../../shared/intranet/intranet-agent-environment'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'

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
  expect(probe).not.toHaveBeenCalled()
})

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
