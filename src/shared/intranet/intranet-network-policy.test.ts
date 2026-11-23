import { describe, expect, it } from 'vitest'
import { isIntranetHost, isIntranetUrl } from './intranet-network-policy'

describe('internal deployment network admission', () => {
  it('refuses public destinations before a connection is attempted', () => {
    expect(isIntranetHost('github.com')).toBe(false)
    expect(isIntranetHost('8.8.8.8')).toBe(false)
    expect(isIntranetHost('172.32.0.1')).toBe(false)
    expect(isIntranetHost('10.0.0.1.attacker.example')).toBe(false)
    expect(isIntranetHost('internal.example.attacker.example', ['internal.example'])).toBe(false)
  })

  it('admits local IPC-adjacent endpoints and configured company services', () => {
    expect(isIntranetHost('127.0.0.1')).toBe(true)
    expect(isIntranetHost('[::1]')).toBe(true)
    expect(isIntranetHost('10.20.3.4')).toBe(true)
    expect(isIntranetHost('172.16.0.1')).toBe(true)
    expect(isIntranetHost('192.168.1.1')).toBe(true)
    expect(isIntranetHost('GIT.COMPANY.INTERNAL.', ['git.company.internal'])).toBe(true)
    expect(isIntranetHost('100.65.2.3', ['100.65.0.0/16'])).toBe(true)
    expect(isIntranetHost('100.66.2.3', ['100.65.0.0/16'])).toBe(false)
  })

  it('admits explicit model servers while rejecting external redirects', () => {
    const settings = {
      allowedHosts: ['git.company.internal'],
      opencode: {
        baseUrl: 'https://llm.company.internal/v1',
        model: 'qwen-internal',
        apiKeyEnv: '',
        models: [],
        configVersion: 'v1' as const
      },
      claude: { baseUrl: '', model: '' }
    }
    expect(isIntranetUrl('https://llm.company.internal/v1/models', settings)).toBe(true)
    expect(isIntranetUrl('https://login.onorca.dev', settings)).toBe(false)
    expect(isIntranetUrl('https://github.com', settings)).toBe(false)
    expect(isIntranetUrl('file:///C:/workspace/readme.md', settings)).toBe(true)
    expect(isIntranetUrl('javascript:alert(1)', settings)).toBe(false)
  })
})
