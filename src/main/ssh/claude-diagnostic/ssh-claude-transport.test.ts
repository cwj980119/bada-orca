import { generateKeyPairSync } from 'node:crypto'
import { once } from 'node:events'
import { Server, utils, type Connection } from 'ssh2'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveWithSshG, type SshResolvedConfig } from '../config/ssh-g-config-resolution'
import type * as SshConfigResolution from '../config/ssh-g-config-resolution'
import type * as HostKeyVerification from '../host-keys/ssh2-host-key-verification'
import { readHostKeyTrustSources } from '../host-keys/ssh2-host-key-verification'
import { sshDiagnosticTransport } from './ssh-claude-transport'

vi.mock('../config/ssh-g-config-resolution', async (original) => ({
  ...(await original<typeof SshConfigResolution>()),
  resolveWithSshG: vi.fn()
}))
vi.mock('../host-keys/ssh2-host-key-verification', async (original) => ({
  ...(await original<typeof HostKeyVerification>()),
  readHostKeyTrustSources: vi.fn()
}))

const hostKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' }
}).privateKey
const parsedKey = utils.parseKey(hostKey)
if (parsedKey instanceof Error) {
  throw parsedKey
}
const publicKey = parsedKey.getPublicSSH()
const clients = new Set<Connection>()
const transports: ReturnType<typeof sshDiagnosticTransport>[] = []
let server: Server | undefined

afterEach(async () => {
  for (const transport of transports.splice(0)) {
    transport.close()
  }
  for (const client of clients) {
    client.end()
  }
  clients.clear()
  if (server) {
    const closed = once(server, 'close')
    server.close()
    await closed
    server = undefined
  }
})

async function fixture(mode: 'password' | 'keyboard-interactive' | 'otp' | 'stall' = 'password') {
  let offeredSecret: string | undefined
  let notifyAuthentication: () => void = () => {}
  const authenticationRequested = new Promise<void>((resolve) => {
    notifyAuthentication = resolve
  })
  server = new Server({ hostKeys: [hostKey] }, (client) => {
    clients.add(client)
    client.on('error', () => {})
    client.on('authentication', (context) => {
      notifyAuthentication()
      if (mode === 'stall') {
        return
      }
      if (mode !== 'password' && context.method === 'keyboard-interactive') {
        context.prompt(
          [{ prompt: mode === 'otp' ? 'OTP: ' : 'Password: ', echo: false }],
          (answers) => {
            offeredSecret = answers[0]
            if (answers[0] === 'temporary-test-secret') {
              context.accept()
            } else {
              context.reject()
            }
          }
        )
      } else if (mode === 'password' && context.method === 'password') {
        offeredSecret = context.password
        if (context.username === 'fixture-user' && context.password === 'temporary-test-secret') {
          context.accept()
        } else {
          context.reject(['password'])
        }
      } else {
        context.reject([mode === 'password' ? 'password' : 'keyboard-interactive'])
      }
    })
    client.on('ready', () => {
      client.on('session', (accept) => {
        accept().on('exec', (acceptExec) => {
          const channel = acceptExec()
          channel.exit(0)
          channel.end('연결됨\n')
        })
      })
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing SSH test endpoint')
  }
  const resolved: SshResolvedConfig = {
    hostname: '127.0.0.1',
    user: 'fixture-user',
    port: address.port,
    identityFile: [],
    identitiesOnly: false,
    forwardAgent: false,
    proxyUseFdpass: false,
    controlMaster: 'no',
    controlPersist: 'no',
    userKnownHostsFiles: [],
    globalKnownHostsFiles: [],
    strictHostKeyChecking: 'yes',
    hashKnownHosts: false,
    updateHostKeys: 'no'
  }
  vi.mocked(resolveWithSshG).mockResolvedValue(resolved)
  vi.mocked(readHostKeyTrustSources).mockResolvedValue({
    siteMayRestrict: false,
    trustedHostKeys: [],
    knownHostsEvidence: {
      unreadableFileCount: 0,
      entries: [
        {
          patterns: [`[127.0.0.1]:${address.port}`],
          negations: [],
          keyType: 'ssh-rsa',
          key: publicKey
        }
      ]
    }
  })
  const create = (password = 'temporary-test-secret') => {
    const transport = sshDiagnosticTransport(
      {
        id: 'fixture',
        label: 'fixture-alias',
        configHost: 'fixture-alias',
        host: 'fixture-alias',
        username: '',
        port: 22
      },
      password
    )
    transports.push(transport)
    return transport
  }
  return { create, offeredSecret: () => offeredSecret, authenticationRequested }
}

describe('SSH Claude password transport', () => {
  it.each(['password', 'keyboard-interactive'] as const)(
    'executes concurrent diagnostic and stop commands with %s authentication',
    async (mode) => {
      const { create } = await fixture(mode)
      const transport = create()
      const replies = await Promise.all([
        transport.execute('diagnostic', 3000),
        transport.execute('stop', 3000)
      ])
      expect(replies).toEqual([
        { stdout: '연결됨\n', code: 0 },
        { stdout: '연결됨\n', code: 0 }
      ])
    }
  )

  it('classifies a refused password without returning the credential', async () => {
    const { create } = await fixture()
    await expect(create('rejected-test-secret').execute('diagnostic', 3000)).rejects.toThrow(
      /^authentication$/
    )
  })

  it('refuses an untrusted host before offering a password', async () => {
    const fixtureState = await fixture()
    vi.mocked(readHostKeyTrustSources).mockResolvedValue({
      siteMayRestrict: false,
      trustedHostKeys: [],
      knownHostsEvidence: { entries: [], unreadableFileCount: 0 }
    })
    await expect(fixtureState.create().execute('diagnostic', 3000)).rejects.toThrow(/^host_key$/)
    expect(fixtureState.offeredSecret()).toBeUndefined()
  })

  it('does not send the password as an OTP answer', async () => {
    const fixtureState = await fixture('otp')
    await expect(fixtureState.create().execute('diagnostic', 3000)).rejects.toThrow(
      /^authentication$/
    )
    expect(fixtureState.offeredSecret()).toBeUndefined()
  })

  it('cancels while authentication is waiting', async () => {
    const { create, authenticationRequested } = await fixture('stall')
    const transport = create()
    const abort = new AbortController()
    const result = transport.execute('diagnostic', 3000, abort.signal)
    await authenticationRequested
    abort.abort()
    await expect(result).rejects.toThrow(/^cancelled$/)
  })
})
