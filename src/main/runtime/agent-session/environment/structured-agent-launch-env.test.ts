import { describe, expect, it } from 'vitest'
import { structuredAgentLaunchEnv } from './structured-agent-launch-env'

const proxy = {
  httpProxyUrl: 'http://proxy.test:8080',
  httpProxyBypassRules: 'localhost;10.0.0.0/8'
}

describe('structuredAgentLaunchEnv', () => {
  it("lets the agent's own proxy replace every spelling of the configured one", () => {
    const env = structuredAgentLaunchEnv(
      'codex',
      { ...proxy, agentDefaultEnv: { codex: { HTTPS_PROXY: 'http://mine:1' } } },
      {},
      'darwin'
    )
    expect(Object.entries(env).filter(([key]) => key.toUpperCase() === 'HTTPS_PROXY')).toEqual([
      ['HTTPS_PROXY', 'http://mine:1']
    ])
    expect(env.http_proxy).toBe('http://proxy.test:8080')
  })
})
