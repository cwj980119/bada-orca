import { describe, expect, it } from 'vitest'
import { getDefaultSettings } from '../../shared/orca-profiles/constants'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'
import { botStartOptions } from './bot-start-options'
import { BotToolRelay } from './tool-relay/bot-tool-relay'
import { botSessionInstructions } from './bot-session-instructions'
import { folderWorkspaceKey } from '../../shared/workspace/identity/workspace-scope'

describe('local company bots', () => {
  it.each(['claude', 'opencode', 'opencode2'] as const)(
    'lets %s choose its own configured model when no company model is registered',
    (agent) => {
      const settings = getDefaultSettings('/fixture')
      settings.nativeChatSessionOptions = { [agent]: { model: 'remembered-chat-model' } }
      expect(botStartOptions(() => settings, { agent }, false)).toEqual({})
      expect(botStartOptions(() => settings, { agent }, true)).toEqual({})
      expect(
        botStartOptions(
          () => settings,
          {
            agent,
            launch: { model: 'company/existing-cli-model' }
          },
          false
        )
      ).toEqual({ model: 'company/existing-cli-model' })
    }
  )
  it('runs Codex with registered company models and rejects an unregistered override', () => {
    const settings = getDefaultSettings('/fixture')
    settings.intranet = {
      ...defaultIntranetSettings(),
      cliModels: {
        codex: { model: 'company-coder', models: [{ id: 'company-coder', name: '', purpose: '' }] }
      }
    }
    settings.nativeChatSessionOptions = { codex: { model: 'public-default' } }
    expect(botStartOptions(() => settings, { agent: 'codex' }, false).model).toBe('company-coder')
    expect(() =>
      botStartOptions(
        () => settings,
        { agent: 'codex', launch: { model: 'public-default' } },
        false
      )
    ).toThrow()
  })
  it('uses registered company models instead of remembered chat defaults, and refuses removed registrations', () => {
    const settings = getDefaultSettings('/fixture')
    settings.intranet = {
      ...defaultIntranetSettings(),
      opencode: {
        baseUrl: 'http://10.20.0.8/v1',
        model: 'coder',
        configVersion: 'v1',
        apiKeyEnv: '',
        models: [
          { id: 'coder', name: 'Coder', purpose: '' },
          { id: 'review', name: 'Review', purpose: '' }
        ]
      }
    }
    settings.nativeChatSessionOptions = { opencode: { model: 'public/model' } }
    expect(botStartOptions(() => settings, { agent: 'opencode' }, false).model).toBe(
      'internal/coder'
    )
    expect(botStartOptions(() => settings, { agent: 'opencode' }, true).model).toBe(
      'internal/coder'
    )
    expect(botStartOptions(() => settings, { agent: 'opencode2' }, false).model).toBe(
      'internal/coder'
    )
    expect(
      botStartOptions(
        () => settings,
        { agent: 'opencode', launch: { model: 'internal/review' } },
        false
      ).model
    ).toBe('internal/review')
    expect(() =>
      botStartOptions(
        () => settings,
        { agent: 'opencode', launch: { model: 'public/model' } },
        false
      )
    ).toThrow()
    expect(() => botStartOptions(() => settings, { agent: 'codex' }, false)).toThrow()
  })

  it('keeps local bot command identity until revocation without starting a tool transport', async () => {
    const relay = new BotToolRelay(() => {
      throw new Error('A transport must not be called.')
    })
    const first = await relay.grant('bot-a', '/fixture/a')
    const second = await relay.grant('bot-b', '/fixture/b')
    expect(relay.botOf(first.token)).toBe('bot-a')
    expect(relay.botOf(second.token)).toBe('bot-b')
    expect(relay.botOf('unknown')).toBeNull()
    relay.revoke('bot-a')
    expect(relay.botOf(first.token)).toBeNull()
    expect(relay.botOf(second.token)).toBe('bot-b')
    relay.close()
    expect(relay.botOf(second.token)).toBeNull()
  })

  it('refuses missing and unregistered models on resumed bot sessions before loading instructions', async () => {
    const settings = defaultIntranetSettings()
    settings.opencode.models = [{ id: 'company/coder', name: '', purpose: '' }]
    settings.opencode.model = 'company/coder'
    for (const model of ['public/model', undefined]) {
      await expect(
        botSessionInstructions(
          { launched: () => {}, linkedSkillsLaunched: () => {} },
          [
            {
              id: 'bot-a',
              name: 'Local bot',
              agent: 'opencode',
              folderWorkspaceId: 'home',
              launch: { model: 'company/coder' }
            }
          ],
          {
            sessionId: 'resumed-session',
            provider: 'opencode',
            location: { workspaceId: folderWorkspaceKey('home') },
            providerHandleChain: ['existing'],
            options: model ? { model } : undefined
          },
          '/fixture',
          null,
          { readText: async () => null },
          settings
        )
      ).rejects.toThrow()
    }
  })

  it.each(['claude', 'opencode', 'opencode2'] as const)(
    'prepares resumed %s bot instructions without requiring a model ID in CLI-default mode',
    async (agent) => {
      await expect(
        botSessionInstructions(
          { launched: () => {}, linkedSkillsLaunched: () => {} },
          [{ id: 'bot-cli', name: 'CLI bot', agent, folderWorkspaceId: 'home' }],
          {
            sessionId: 'resumed-session',
            provider: agent,
            location: { workspaceId: folderWorkspaceKey('home') },
            providerHandleChain: ['existing']
          },
          '/fixture',
          null,
          { readText: async () => null },
          defaultIntranetSettings()
        )
      ).resolves.toEqual(expect.any(String))
    }
  )
})
