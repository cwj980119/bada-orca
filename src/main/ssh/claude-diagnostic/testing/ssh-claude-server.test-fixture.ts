import { generateKeyPairSync } from 'node:crypto'
import { once } from 'node:events'
import type { Server, Connection } from 'ssh2'
import { loadSsh2 } from '../../authentication/ssh2-module-load'
import { afterEach, vi } from 'vitest'
import { resolveWithSshG, type SshResolvedConfig } from '../../config/ssh-g-config-resolution'
import type * as SshConfigResolution from '../../config/ssh-g-config-resolution'
import type * as HostKeyVerification from '../../host-keys/ssh2-host-key-verification'
import { readHostKeyTrustSources } from '../../host-keys/ssh2-host-key-verification'
import { sshDiagnosticTransport } from '../ssh-claude-transport'
import type { SshClaudeConnectionEvent } from '../../../../shared/intranet/ssh-claude-diagnostic'
import { serveSshClaudeShell } from './ssh-claude-shell-server.test-fixture'

vi.mock('../../config/ssh-g-config-resolution', async (original) => ({
  ...(await original<typeof SshConfigResolution>()),
  resolveWithSshG: vi.fn()
}))
vi.mock('../../host-keys/ssh2-host-key-verification', async (original) => ({
  ...(await original<typeof HostKeyVerification>()),
  readHostKeyTrustSources: vi.fn()
}))

const hostKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' }
}).privateKey
const { Server: SshServer, utils } = loadSsh2()
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

export async function fixture(
  mode:
    | 'password'
    | 'keyboard-interactive'
    | 'otp'
    | 'stall'
    | 'command-refused'
    | 'legacy-kex'
    | 'shell-only'
    | 'broken-shell'
    | 'stall-shell' = 'password',
  shellReply = { stdout: '셸 명령 결과\n', code: 0 }
) {
  let offeredSecret: string | undefined
  const events: SshClaudeConnectionEvent[] = []
  const commands: string[] = []
  let notifyAuthentication: () => void = () => {}
  const authenticationRequested = new Promise<void>((resolve) => {
    notifyAuthentication = resolve
  })
  server = new SshServer(
    {
      hostKeys: [hostKey],
      banner: 'Unauthorized access is forbidden. Actions may be monitored.',
      ...(mode === 'legacy-kex' ? { algorithms: { kex: ['diffie-hellman-group1-sha1'] } } : {})
    },
    (client) => {
      clients.add(client)
      client.on('error', () => {})
      client.on('authentication', (context) => {
        notifyAuthentication()
        if (mode === 'stall') {
          return
        }
        const keyboard = mode === 'keyboard-interactive' || mode === 'otp'
        if (keyboard && context.method === 'keyboard-interactive') {
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
        } else if (!keyboard && context.method === 'password') {
          offeredSecret = context.password
          if (context.username === 'fixture-user' && context.password === 'temporary-test-secret') {
            context.accept()
          } else {
            context.reject(['password'])
          }
        } else {
          context.reject([keyboard ? 'keyboard-interactive' : 'password'])
        }
      })
      client.on('ready', () => {
        client.on('session', (accept, reject) => {
          if (mode === 'command-refused') {
            reject()
            return
          }
          const session = accept()
          if (mode === 'shell-only' || mode === 'broken-shell' || mode === 'stall-shell') {
            session.on('exec', (_acceptExec, rejectExec) => rejectExec())
            session.on('pty', (acceptPty) => acceptPty?.())
            session.on('shell', (acceptShell) =>
              serveSshClaudeShell(acceptShell(), commands, mode, shellReply)
            )
            return
          }
          session.on('exec', (acceptExec) => {
            const channel = acceptExec()
            channel.exit(0)
            channel.end('연결됨\n')
          })
        })
      })
    }
  )
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
      password,
      (event) => events.push(event)
    )
    transports.push(transport)
    return transport
  }
  return { create, events, commands, offeredSecret: () => offeredSecret, authenticationRequested }
}

export async function closeFixtureServer() {
  if (!server) {
    return
  }
  const closed = once(server, 'close')
  server.close()
  await closed
  server = undefined
}

export function untrustFixtureHost(): void {
  vi.mocked(readHostKeyTrustSources).mockResolvedValue({
    siteMayRestrict: false,
    trustedHostKeys: [],
    knownHostsEvidence: { entries: [], unreadableFileCount: 0 }
  })
}

export function failFixtureConfiguration(): void {
  vi.mocked(resolveWithSshG).mockResolvedValue(null)
}
