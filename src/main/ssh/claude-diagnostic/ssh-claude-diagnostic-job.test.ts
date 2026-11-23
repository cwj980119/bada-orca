import { describe, expect, it } from 'vitest'
import { readClaudeDiagnosticResult } from './ssh-claude-diagnostic-job'
import { sshClaudeDiagnosticReport } from '../../../shared/intranet/ssh-claude-diagnostic'

describe('SSH Claude diagnostic replies', () => {
  it('reads the result after the owned process marker and a login banner', () => {
    expect(
      readClaudeDiagnosticResult(
        {
          code: 0,
          stdout:
            'Company SSH banner\norca-diag-test:pid:501\n{"type":"result","session_id":"session-one","is_error":false,"result":"ORCA_token"}\n'
        },
        'orca-diag-test',
        'session-one'
      )
    ).toBe('ORCA_token')
  })

  it('refuses a successful reply belonging to a different conversation', () => {
    expect(() =>
      readClaudeDiagnosticResult(
        {
          code: 0,
          stdout:
            'orca-diag-test:pid:501\n{"type":"result","session_id":"session-two","is_error":false,"result":"ORCA_token"}\n'
        },
        'orca-diag-test',
        'session-one'
      )
    ).toThrow('invalid_response')
  })

  it('does not accept an error result as a model response', () => {
    expect(() =>
      readClaudeDiagnosticResult(
        {
          code: 0,
          stdout:
            'orca-diag-test:pid:501\n{"type":"result","session_id":"session-one","is_error":true,"result":"authentication failed"}\n'
        },
        'orca-diag-test',
        'session-one'
      )
    ).toThrow('invalid_response')
  })

  it('does not expose raw provider output when the command fails', () => {
    expect(() =>
      readClaudeDiagnosticResult(
        { code: 1, stdout: 'private provider credential' },
        'orca-diag-test',
        'session-one'
      )
    ).toThrow(/^claude_failed$/)
  })

  it('reports the remote deadline as a timeout even if output resembles success', () => {
    expect(() =>
      readClaudeDiagnosticResult(
        {
          code: 124,
          stdout:
            'orca-diag-test:pid:501\n{"type":"result","session_id":"session-one","is_error":false,"result":"ORCA_token"}\n'
        },
        'orca-diag-test',
        'session-one'
      )
    ).toThrow('timed_out')
  })

  it('copies only the diagnostic report fields, including inside each step', () => {
    const report = sshClaudeDiagnosticReport(
      Object.assign(
        {
          id: 'private-session-id',
          state: 'failed' as const,
          startedAt: '2026-11-23T00:00:00.000Z',
          steps: [
            Object.assign(
              {
                phase: 'response' as const,
                state: 'failed' as const,
                problem: 'claude_failed' as const
              },
              { rawOutput: 'private provider credential' }
            )
          ]
        },
        { destination: 'private-server', directory: '/private/project' }
      )
    )
    expect(JSON.parse(report)).toEqual({
      format: 'orca-ssh-claude-diagnostic-v1',
      state: 'failed',
      startedAt: '2026-11-23T00:00:00.000Z',
      steps: [{ phase: 'response', state: 'failed', problem: 'claude_failed' }]
    })
  })
})
