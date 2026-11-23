import { expect, it } from 'vitest'
import { intranetSettingsUpdate } from './intranet-settings-update'
import { defaultIntranetSettings } from '../../../shared/intranet/intranet-settings'
import type { GlobalSettings } from '../../../shared/settings/global-settings-types'

it('updates Codex session defaults when a registered model is removed', () => {
  const configured = defaultIntranetSettings()
  configured.cliModels = {
    codex: {
      model: 'coder',
      models: [
        { id: 'coder', name: '', purpose: '' },
        { id: 'reviewer', name: '', purpose: '' }
      ]
    }
  }
  const settings = {
    intranet: configured,
    agentLaunchChoices: { codex: { model: 'reviewer' } },
    nativeChatSessionOptions: { codex: { model: 'reviewer' } }
  }
  const next = structuredClone(configured)
  next.cliModels!.codex!.models.pop()
  const updated = intranetSettingsUpdate(settings, next)
  expect(updated.agentLaunchChoices?.codex?.model).toBe('coder')
  expect(updated.nativeChatSessionOptions?.codex?.model).toBe('coder')
  expect(
    intranetSettingsUpdate({ disabledTuiAgents: ['codex'] }, configured).disabledTuiAgents
  ).toEqual([])
  expect(
    intranetSettingsUpdate({ ...settings, disabledTuiAgents: ['codex'] }, next).disabledTuiAgents
  ).toEqual(['codex'])
})

it('keeps per-session choices when editing labels and replaces a removed model choice', () => {
  const configured = defaultIntranetSettings()
  configured.opencode = {
    ...configured.opencode,
    baseUrl: 'http://10.1.2.3/v1',
    model: 'code',
    models: [
      { id: 'code', name: 'Code', purpose: '' },
      { id: 'review', name: 'Review', purpose: '' }
    ]
  }
  const settings = {
    intranet: configured,
    agentLaunchChoices: { opencode: { model: 'internal/review' } },
    nativeChatSessionOptions: { opencode: { model: 'internal/review' } }
  }
  const renamed = structuredClone(configured)
  renamed.opencode.models[1].name = 'Reviewer'
  const retained = intranetSettingsUpdate(settings, renamed)
  expect(retained.agentLaunchChoices?.opencode?.model).toBe('internal/review')
  const removed = structuredClone(renamed)
  removed.opencode.models.pop()
  const updated = intranetSettingsUpdate(settings, removed)
  expect(updated.agentLaunchChoices?.opencode?.model).toBe('internal/code')
  expect(updated.nativeChatSessionOptions?.opencode?.model).toBe('internal/code')
})

it('replaces saved internal model defaults and restores CLI inheritance when cleared', () => {
  const settings: Pick<
    GlobalSettings,
    'intranet' | 'agentLaunchChoices' | 'nativeChatSessionOptions'
  > = {
    agentLaunchChoices: { claude: { options: { effort: 'high' } } }
  }
  const configured = defaultIntranetSettings()
  configured.opencode = {
    baseUrl: 'http://10.1.2.3/v1',
    model: 'coder',
    configVersion: 'v1',
    apiKeyEnv: '',
    models: []
  }
  configured.claude.model = 'company-claude'
  Object.assign(settings, intranetSettingsUpdate(settings, configured))
  expect(settings.agentLaunchChoices?.opencode?.model).toBe('internal/coder')
  expect(settings.agentLaunchChoices?.claude).toEqual({
    model: 'company-claude',
    options: { effort: 'high' }
  })
  Object.assign(settings, intranetSettingsUpdate(settings, defaultIntranetSettings()))
  expect(settings.agentLaunchChoices?.opencode?.model).toBeUndefined()
  expect(settings.nativeChatSessionOptions?.opencode?.model).toBeUndefined()
  expect(settings.agentLaunchChoices?.claude).toEqual({ options: { effort: 'high' } })
})
