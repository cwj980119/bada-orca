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
import type { SshClaudeConnectionObserver } from '../../../shared/intranet/ssh-claude-diagnostic'
import { SshClaudeDiagnosticFailure, sshClaudeFailure } from './ssh-claude-failure'
import type { SshClaudeOpenedChannel } from './ssh-claude-channel'

export class SshClaudePasswordSession {
  private password: string | undefined
  private client: Client | null = null
  private readonly pending = new Set<Client>()
  private connecting: Promise<void> | null = null
  private proxy: ReturnType<typeof spawnProxyCommand> | null = null
  private closed = false
  private useShell = false

  constructor(
    private readonly target: SshTarget,
    password: string,
    private readonly observe: SshClaudeConnectionObserver
  ) {
    this.password = password
  }

  async open(command: string): Promise<SshClaudeOpenedChannel> {
    this.connecting ??= this.connect()
    await this.connecting
    if (this.closed || !this.client) {
      throw new Error('SSH session closed')
    }
    if (this.useShell) {
      return this.openShell()
    }
    this.observe('command_opening')
    try {
      const channel = await new Promise<ClientChannel>((resolve, reject) => {
        this.client!.exec(command, (error, channel) => {
          if (error) {
            const problem = sshClaudeFailure(error)
            reject(
              new SshClaudeDiagnosticFailure(problem === 'ssh_failed' ? 'command_refused' : problem)
            )
          } else if (this.closed) {
            channel.close()
            reject(new Error('SSH session closed'))
          } else {
            this.observe('command_opened')
            channel.end()
            resolve(channel)
          }
        })
      })
      return { channel }
    } catch (error) {
      if (sshClaudeFailure(error) !== 'command_refused' || this.closed) {
        throw error
      }
      this.observe('exec_refused')
      this.useShell = true
      return this.openShell()
    }
  }

  private openShell(): Promise<SshClaudeOpenedChannel> {
    this.observe('shell_opening')
    return new Promise((resolve, reject) => {
      if (!this.client || this.closed) {
        reject(new SshClaudeDiagnosticFailure('connection_reset'))
        return
      }
      this.client.shell(
        { term: 'dumb', cols: 4096, rows: 24, modes: { ECHO: 0, ECHONL: 0, ONLCR: 0 } },
        (error, channel) => {
          if (error) {
            reject(new SshClaudeDiagnosticFailure('shell_refused'))
          } else if (this.closed) {
            channel.on('error', () => {})
            channel.close()
            reject(new SshClaudeDiagnosticFailure('cancelled'))
          } else {
            this.observe('shell_opened')
            resolve({ channel, shell: true })
          }
        }
      )
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
    this.observe('config_reading')
    const resolved = await resolveWithSshG(this.target.configHost || this.target.host)
    if (this.closed) {
      throw new Error('SSH session closed')
    }
    if (!resolved || resolved.proxyUseFdpass) {
      if (resolved?.proxyUseFdpass) {
        this.observe('proxy_unsupported')
      }
      throw new SshClaudeDiagnosticFailure('ssh_configuration')
    }
    const config = buildConnectConfig(this.target, resolved, { keyboardInteractiveOnly: true })
    this.observe('config_resolved', config.port)
    config.password = this.password
    const authenticate = config.authHandler
    if (typeof authenticate !== 'function') {
      throw new SshClaudeDiagnosticFailure('ssh_configuration')
    }
    let unsupportedMethod = false
    config.authHandler = (methods, partial, next) => {
      if (
        Array.isArray(methods) &&
        methods.length &&
        !methods.includes('password') &&
        !methods.includes('keyboard-interactive')
      ) {
        unsupportedMethod = true
      }
      authenticate(methods, partial, (attempt) => {
        if (typeof attempt === 'object' && attempt?.type === 'password') {
          this.observe('password_offered')
        }
        next(attempt)
      })
    }
    const verdict = await installSsh2HostKeyVerification(config, {
      target: this.target,
      hostKeyResolved: resolved,
      loadTrustSources: (suppressed) => readHostKeyTrustSources(resolved, suppressed),
      isCurrentAttempt: () => !this.closed,
      onAcceptedFingerprint: () => this.observe('host_verified')
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
    let unsupportedPrompt = false
    try {
      this.observe('connecting')
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
            unsupportedPrompt = true
            this.observe('unsupported_prompt')
            return null
          }
          answered = true
          this.observe('keyboard_password_offered')
          return [this.password]
        },
        hostKeyRejection: () => verdict.rejection,
        adoptClient: (client) => {
          this.client = client
          client.on('error', () => this.close())
          client.on('close', () => this.close())
        },
        onConnected: () => this.observe('authenticated')
      })
    } catch (error) {
      if (unsupportedPrompt) {
        throw new SshClaudeDiagnosticFailure('interactive_authentication')
      }
      if (unsupportedMethod) {
        throw new SshClaudeDiagnosticFailure('authentication_method')
      }
      throw error
    } finally {
      config.password = undefined
      this.password = undefined
    }
  }
}
