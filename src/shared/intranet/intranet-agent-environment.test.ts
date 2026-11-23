import { describe, expect, it } from 'vitest'
import { intranetAgentEnvironment } from './intranet-agent-environment'

describe('internal model launch configuration', () => {
  it('registers all gateway models and carries the chosen default into OpenCode', () => {
    const env = intranetAgentEnvironment(
      'opencode',
      {
        allowedHosts: [],
        opencode: {
          baseUrl: 'http://10.20.0.5/v1',
          model: 'reasoner',
          configVersion: 'v1',
          models: [
            { id: 'coder', name: 'Code', purpose: 'implementation' },
            { id: 'reasoner', name: 'Reason', purpose: 'review' }
          ]
        },
        claude: { baseUrl: '', model: '' }
      },
      {}
    )
    const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT)
    expect(config.model).toBe('internal/reasoner')
    expect(config.small_model).toBe('internal/reasoner')
    expect(Object.keys(config.provider.internal.models)).toEqual(['coder', 'reasoner'])
    expect(config.provider.internal.models.coder.name).toBe('Code · implementation')
  })

  it('selects registered models from existing CLI providers without replacing them', () => {
    const env = intranetAgentEnvironment(
      'opencode',
      {
        allowedHosts: [],
        opencode: {
          baseUrl: '',
          model: 'company/reviewer',
          configVersion: 'v1',
          models: [
            { id: 'company/coder', name: 'Code', purpose: '' },
            { id: 'company/reviewer', name: 'Review', purpose: '' }
          ]
        },
        claude: { baseUrl: '', model: '' }
      },
      { OPENCODE_CONFIG_CONTENT: '{"provider":{"company":{"options":{"apiKey":"existing"}}}}' }
    )
    const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT)
    expect(config.model).toBe('company/reviewer')
    expect(config.provider.company.options.apiKey).toBe('existing')
    expect(config.provider.internal).toBeUndefined()
    expect(config.enabled_providers).toBeUndefined()
  })
  it('keeps inherited OpenCode file configuration active when no endpoint override is saved', () => {
    const env = intranetAgentEnvironment('opencode', undefined, {
      OPENCODE_CONFIG: '/company/opencode.json'
    })
    expect(env.OPENCODE_CONFIG).toBe('/company/opencode.json')
    expect(env.OPENCODE_CONFIG_CONTENT).toBeUndefined()
    expect(env.OPENCODE_DISABLE_MODELS_FETCH).toBe('true')
    const inline = '{ // company policy\n "model": "company/coder", }'
    expect(
      intranetAgentEnvironment('opencode', undefined, { OPENCODE_CONFIG_CONTENT: inline })
        .OPENCODE_CONFIG_CONTENT
    ).toBe(inline)
  })

  it('uses the v2 provider schema and an existing credential environment variable', () => {
    const env = intranetAgentEnvironment(
      'opencode2',
      {
        allowedHosts: [],
        opencode: {
          baseUrl: 'http://10.20.0.5/v1',
          model: 'coder',
          configVersion: 'v2',
          apiKeyEnv: 'COMPANY_API_KEY'
        },
        claude: { baseUrl: '', model: '' }
      },
      { COMPANY_API_KEY: 'existing-token' }
    )
    const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT)
    expect(config.providers.internal.settings.baseURL).toBe('http://10.20.0.5/v1')
    expect(config.providers.internal.env).toEqual(['COMPANY_API_KEY'])
    expect(config.update).toBe('disable')
    expect(config.provider).toBeUndefined()
    expect(config.autoupdate).toBeUndefined()
    expect(env.COMPANY_API_KEY).toBe('existing-token')
  })
  it('preserves existing CLI credentials while disabling public background services', () => {
    const env = intranetAgentEnvironment('claude', undefined, {
      ANTHROPIC_BASE_URL: 'https://gateway.company.internal',
      ANTHROPIC_AUTH_TOKEN: 'existing-token'
    })
    expect(env.ANTHROPIC_BASE_URL).toBe('https://gateway.company.internal')
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe('existing-token')
    expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe('1')
    expect(env.DISABLE_AUTOUPDATER).toBe('1')
  })

  it('uses the CLI environment instead of legacy company Claude model overrides', () => {
    const env = intranetAgentEnvironment(
      'claude',
      {
        allowedHosts: [],
        opencode: { baseUrl: '', model: '', configVersion: 'v1' },
        claude: { baseUrl: 'http://10.20.0.5:8000', model: 'company-model' }
      },
      { ANTHROPIC_BASE_URL: 'https://local-gateway.internal', ANTHROPIC_MODEL: 'local-model' }
    )
    expect(env.ANTHROPIC_BASE_URL).toBe('https://local-gateway.internal')
    expect(env.ANTHROPIC_MODEL).toBe('local-model')
    expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined()
    expect(env.ANTHROPIC_SMALL_FAST_MODEL).toBeUndefined()
  })

  it('merges OpenCode settings and forces an internal provider without rewriting CLI files', () => {
    const env = intranetAgentEnvironment(
      'opencode',
      {
        allowedHosts: [],
        opencode: {
          baseUrl: 'http://10.20.0.5:8000/v1',
          model: 'company-model',
          configVersion: 'v1'
        },
        claude: { baseUrl: '', model: '' }
      },
      { OPENCODE_CONFIG_CONTENT: '{"theme":"existing","share":"auto","autoupdate":true}' }
    )
    const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT)
    expect(config.theme).toBe('existing')
    expect(config.autoupdate).toBe(false)
    expect(config.share).toBe('disabled')
    expect(config.enabled_providers).toEqual(['internal'])
    expect(config.model).toBe('internal/company-model')
    expect(config.provider.internal.options.baseURL).toBe('http://10.20.0.5:8000/v1')
  })
})
