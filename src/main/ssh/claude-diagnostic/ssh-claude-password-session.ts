import type { Client, ClientChannel } from 'ssh2'
import type { SshTarget } from '../../../shared/remote-runtime/ssh/ssh-types'
import { buildConnectConfig } from '../connection/ssh-connect-config'
import { resolveWithSshG } from '../config/ssh-g-config-resolution'
import { runSsh2Handshake } from '../authentication/ssh2-handshake'
import { isKeyboardInteractivePasswordPrompt } from '../authentication/ssh-keyboard-interactive'
import {
  installSsh2HostKeyVerification,
  readHostKeyTrustSources
} from '../host-keys/ssh2-host-key-verification'
import { resolveEffectiveProxy, spawnProxyCommand } from '../system-transport/ssh-proxy-command'

export class SshClaudePasswordSession {
  private password: string | undefined
  private client: Client | null = null
  private readonly pending = new Set<Client>()
  private connecting: Promise<void> | null = null
  private proxy: ReturnType<typeof spawnProxyCommand> | null = null
  private closed = false

  constructor(
    private readonly target: SshTarget,
    password: string
  ) {
    this.password = password
  }

  async open(command: string): Promise<ClientChannel> {
    this.connecting ??= this.connect()
    await this.connecting
    if (this.closed || !this.client) {
      throw new Error('SSH session closed')
    }
    return new Promise((resolve, reject) => {
      this.client!.exec(command, (error, channel) => {
        if (error) {
          reject(error)
        } else if (this.closed) {
          channel.close()
          reject(new Error('SSH session closed'))
        } else {
          channel.end()
          resolve(channel)
        }
      })
    })
  }

  close(): void {
    if (this.closed) {
      return
    }
    this.closed = true
    this.password = undefined
    this.client?.destroy()
    this.client = null
    for (const client of this.pending) {
      client.destroy()
    }
    this.proxy?.sock.destroy()
    this.proxy?.process.kill()
    this.proxy = null
  }

  private async connect(): Promise<void> {
    const resolved = await resolveWithSshG(this.target.configHost || this.target.host)
    if (this.closed) {
      throw new Error('SSH session closed')
    }
    if (!resolved || resolved.proxyUseFdpass) {
      throw new Error('SSH configuration could not be used for password authentication')
    }
    const config = buildConnectConfig(this.target, resolved, { keyboardInteractiveOnly: true })
    config.password = this.password
    config.authHandler = ['password', 'keyboard-interactive']
    const verdict = await installSsh2HostKeyVerification(config, {
      target: this.target,
      hostKeyResolved: resolved,
      loadTrustSources: (suppressed) => readHostKeyTrustSources(resolved, suppressed),
      isCurrentAttempt: () => !this.closed,
      onAcceptedFingerprint: () => {}
    })
    if (this.closed) {
      throw new Error('SSH session closed')
    }
    const proxy = resolveEffectiveProxy(this.target, resolved)
    if (proxy) {
      this.proxy = spawnProxyCommand(proxy, config.host!, config.port!, config.username!)
      config.sock = this.proxy.sock
    }
    let answered = false
    try {
      await runSsh2Handshake(config, {
        label: this.target.label,
        pendingClients: this.pending,
        isCurrentAttempt: () => !this.closed,
        isNewestGeneration: () => !this.closed,
        isDisposed: () => this.closed,
        isKeyboardInteractiveCancelled: () => this.closed,
        answerKeyboardInteractive: async (_host, _name, _instructions, prompts) => {
          if (
            this.closed ||
            answered ||
            prompts.length !== 1 ||
            !isKeyboardInteractivePasswordPrompt(prompts[0]) ||
            !this.password
          ) {
            return null
          }
          answered = true
          return [this.password]
        },
        hostKeyRejection: () => verdict.rejection,
        adoptClient: (client) => {
          this.client = client
          client.on('error', () => this.close())
          client.on('close', () => this.close())
        },
        onConnected: () => {}
      })
    } finally {
      config.password = undefined
      this.password = undefined
    }
  }
}
