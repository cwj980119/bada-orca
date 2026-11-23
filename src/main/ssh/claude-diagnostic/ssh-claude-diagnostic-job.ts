import { randomUUID } from 'node:crypto'
import { readClaudeDiagnosticResult } from './ssh-claude-reply'
export { readClaudeDiagnosticResult } from './ssh-claude-reply'
import { withTimeout } from '../../../shared/concurrency/promise-timeout-fallback'
import type {
  SshClaudeDiagnosticInput,
  SshClaudeDiagnosticPhase,
  SshClaudeDiagnosticProblem,
  SshClaudeDiagnosticResult,
  SshClaudeConnectionEvent
} from '../../../shared/intranet/ssh-claude-diagnostic'
import {
  claudeDiagnosticCommand,
  claudeDiagnosticPreflight,
  ownedDiagnosticCommand,
  stopDiagnosticCommand
} from './ssh-claude-commands'
import {
  SshClaudeDiagnosticFailure,
  type SshDiagnosticExecute,
  type SshDiagnosticReply
} from './ssh-claude-transport'

type OwnedDiagnostic = {
  marker: string
  controller: AbortController
  ready: Promise<number>
  stop?: Promise<boolean>
}

const phases: SshClaudeDiagnosticPhase[] = [
  'ssh',
  'connection',
  'response',
  'resume',
  'cancellation'
]

function failure(problem: SshClaudeDiagnosticProblem): never {
  throw new SshClaudeDiagnosticFailure(problem)
}

export class SshClaudeDiagnosticJob {
  private readonly result: SshClaudeDiagnosticResult
  private active: OwnedDiagnostic | null = null
  private readonly preflightAbort = new AbortController()
  private cancelled = false

  constructor(
    private readonly input: SshClaudeDiagnosticInput,
    private readonly execute: SshDiagnosticExecute
  ) {
    const selectedPhases: SshClaudeDiagnosticPhase[] = input.mode === 'ssh' ? ['ssh'] : phases
    this.result = {
      id: randomUUID(),
      state: 'running',
      startedAt: new Date().toISOString(),
      mode: input.mode ?? 'full',
      events: [],
      steps: selectedPhases.map((phase) => ({
        phase,
        state: 'pending'
      }))
    }
  }

  snapshot(): SshClaudeDiagnosticResult {
    return {
      ...this.result,
      events: [...(this.result.events ?? [])],
      steps: this.result.steps.map((step) => ({ ...step }))
    }
  }

  observeConnection(event: SshClaudeConnectionEvent, port?: number): void {
    const events = this.result.events!
    if (!events.includes(event) && events.length < 20) {
      events.push(event)
    }
    if (port && Number.isInteger(port) && port > 0 && port <= 65535) {
      this.result.port = port
    }
  }

  cancel(): void {
    if (this.result.state !== 'running' && this.result.state !== 'cancelling') {
      return
    }
    this.cancelled = true
    this.result.state = 'cancelling'
    this.preflightAbort.abort()
    if (this.active) {
      void this.stop(this.active)
    }
  }

  async run(): Promise<void> {
    try {
      await this.phase('ssh', () => this.checkSsh())
      if (this.input.mode === 'ssh') {
        this.result.state = 'passed'
        return
      }
      await this.phase('connection', () => this.preflight())
      const sessionId = randomUUID()
      const token = `ORCA_${randomUUID().replaceAll('-', '')}`
      await this.phase('response', async () => {
        const marker = `orca-diag-${randomUUID()}`
        const prompt = `Connection test only. Do not use any tools. Reply with exactly this token and nothing else: ${token}`
        const reply = await this.owned(
          marker,
          claudeDiagnosticCommand(this.input, sessionId, prompt, false)
        )
        if (readClaudeDiagnosticResult(reply, marker, sessionId) !== token) {
          failure('invalid_response')
        }
      })
      await this.phase('resume', async () => {
        const marker = `orca-diag-${randomUUID()}`
        const prompt =
          'Connection test only. Do not use tools. Return exactly the ORCA_ token from the previous user message, without any other text.'
        const reply = await this.owned(
          marker,
          claudeDiagnosticCommand(this.input, sessionId, prompt, true)
        )
        if (readClaudeDiagnosticResult(reply, marker, sessionId) !== token) {
          failure('resume_failed')
        }
      })
      await this.phase('cancellation', async () => {
        try {
          await this.owned(`orca-diag-${randomUUID()}`, ['sleep', '60'], true)
        } catch (error) {
          if (!(error instanceof SshClaudeDiagnosticFailure) || error.problem !== 'cancelled') {
            throw error
          }
        }
        if (this.result.stopVerified !== true) {
          failure('stop_unconfirmed')
        }
      })
      this.assertRunning()
      this.result.state = 'passed'
    } catch (error) {
      const problem =
        this.result.stopVerified === false
          ? 'stop_unconfirmed'
          : this.cancelled
            ? 'cancelled'
            : error instanceof SshClaudeDiagnosticFailure
              ? error.problem
              : 'internal_error'
      const running = this.result.steps.find((step) => step.state === 'running')
      if (running) {
        running.state = 'failed'
        running.problem = problem
      }
      this.result.problem = problem
      this.result.state = this.cancelled ? 'cancelled' : 'failed'
    } finally {
      for (const step of this.result.steps) {
        if (step.state === 'pending') {
          step.state = 'skipped'
        }
      }
      this.result.finishedAt = new Date().toISOString()
    }
  }

  private assertRunning(): void {
    if (this.cancelled) {
      failure('cancelled')
    }
  }

  private async phase(
    phase: SshClaudeDiagnosticPhase,
    operation: () => Promise<void>
  ): Promise<void> {
    this.assertRunning()
    const step = this.result.steps.find((entry) => entry.phase === phase)!
    step.state = 'running'
    await operation()
    this.assertRunning()
    step.state = 'passed'
  }

  private async preflight(): Promise<void> {
    const marker = `orca-diag-${randomUUID()}`
    const reply = await this.execute(
      claudeDiagnosticPreflight(this.input, marker),
      25_000,
      this.preflightAbort.signal
    )
    const problems = [
      'linux_required',
      'directory_missing',
      'claude_missing',
      'process_control_missing'
    ] as const
    for (const problem of problems) {
      if (reply.stdout.includes(`${marker}:${problem}`)) {
        failure(problem)
      }
    }
    if (reply.code !== 0) {
      failure('claude_failed')
    }
    const versionOutput = reply.stdout.split(`${marker}:version\n`)[1]?.trim()
    const version = versionOutput?.match(/^(\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?)(?:\s|$)/)?.[1]
    if (!version || version.length > 60) {
      failure('invalid_response')
    }
    this.result.claudeVersion = version
  }

  private async checkSsh(): Promise<void> {
    const marker = `orca-diag-${randomUUID()}`
    const reply = await this.execute(
      `printf '%s\\n' '${marker}:ssh-ready'; pwd -P`,
      25_000,
      this.preflightAbort.signal
    )
    if (reply.code !== 0 || !reply.stdout.includes(`${marker}:ssh-ready\n`)) {
      failure('ssh_protocol')
    }
    const directory = reply.stdout.split(`${marker}:ssh-ready\n`)[1]?.split('\n')[0]?.trim()
    if (directory?.startsWith('/') && directory.length <= 2048 && !/[\0\r]/.test(directory)) {
      this.result.remoteDirectory = directory
    }
  }

  private async owned(
    marker: string,
    args: string[],
    stopOnReady = false
  ): Promise<SshDiagnosticReply> {
    this.assertRunning()
    let ready: (pid: number) => void = () => {}
    const active: OwnedDiagnostic = {
      marker,
      controller: new AbortController(),
      ready: new Promise<number>((resolve) => {
        ready = resolve
      })
    }
    this.active = active
    let pidPublished = false
    try {
      const seconds = stopOnReady ? 15 : this.input.timeoutSeconds
      const command = ownedDiagnosticCommand(this.input.directory, marker, seconds, args)
      const reply = await this.execute(
        command,
        (seconds + 10) * 1000,
        active.controller.signal,
        (stdout) => {
          if (pidPublished) {
            return
          }
          const pid = stdout.match(new RegExp(`(?:^|\\n)${marker}:pid:([0-9]+)\\r?\\n`))?.[1]
          if (!pid || !Number.isSafeInteger(Number(pid)) || Number(pid) < 2) {
            return
          }
          pidPublished = true
          ready(Number(pid))
          if (stopOnReady || this.cancelled) {
            void this.stop(active)
          }
        }
      )
      if (active.stop) {
        await active.stop
      }
      return reply
    } catch (error) {
      await this.stop(active)
      throw error
    } finally {
      if (this.active === active) {
        this.active = null
      }
    }
  }

  private stop(active: OwnedDiagnostic): Promise<boolean> {
    active.stop ??= (async () => {
      const pid = await withTimeout<number | null>(active.ready, 3000, null)
      if (!pid) {
        return false
      }
      const reply = await this.execute(stopDiagnosticCommand(pid, active.marker), 12_000)
      return reply.code === 0 && reply.stdout.includes(`${active.marker}:stopped`)
    })()
      .catch(() => false)
      .then((verified) => {
        this.result.stopVerified = verified
        active.controller.abort()
        return verified
      })
    return active.stop
  }
}
