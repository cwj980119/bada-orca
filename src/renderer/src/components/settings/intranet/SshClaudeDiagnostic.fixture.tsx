import { defineFixture } from '../../../component-fixtures/component-fixture'
import { SshClaudeDiagnostic } from './SshClaudeDiagnostic'
import { SshClaudeDiagnosticResultView } from './SshClaudeDiagnosticResultView'
import { SshClaudeConnectionFields } from './SshClaudeConnectionFields'
import type { SshClaudeDiagnosticResult } from '../../../../../shared/intranet/ssh-claude-diagnostic'

const passed: SshClaudeDiagnosticResult = {
  id: 'e0847347-3048-47c4-8f37-46ddf2195694',
  state: 'passed',
  startedAt: '2026-11-23T00:00:00.000Z',
  claudeVersion: '2.1.0',
  stopVerified: true,
  steps: [
    { phase: 'ssh', state: 'passed' },
    { phase: 'connection', state: 'passed' },
    { phase: 'response', state: 'passed' },
    { phase: 'resume', state: 'passed' },
    { phase: 'cancellation', state: 'passed' }
  ]
}

export const form = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <SshClaudeDiagnostic />
    </div>
  )
})

export const completed = defineFixture({
  width: 640,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <SshClaudeDiagnosticResultView result={passed} />
    </div>
  )
})

export const passwordFailure = defineFixture({
  width: 640,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <SshClaudeDiagnosticResultView
        result={{
          ...passed,
          state: 'failed',
          claudeVersion: undefined,
          stopVerified: undefined,
          mode: 'ssh',
          port: 22,
          events: [
            'password_mode',
            'config_reading',
            'config_resolved',
            'connecting',
            'host_verified',
            'password_offered'
          ],
          problem: 'authentication',
          steps: [{ phase: 'ssh', state: 'failed', problem: 'authentication' }]
        }}
      />
    </div>
  )
})

export const sshOnlyPassed = defineFixture({
  width: 640,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <SshClaudeDiagnosticResultView
        result={{
          ...passed,
          claudeVersion: undefined,
          stopVerified: undefined,
          mode: 'ssh',
          port: 22,
          remoteDirectory: '/home/example',
          events: [
            'password_mode',
            'config_reading',
            'config_resolved',
            'connecting',
            'host_verified',
            'password_offered',
            'authenticated',
            'command_opening',
            'command_opened',
            'command_completed'
          ],
          steps: [{ phase: 'ssh', state: 'passed' }]
        }}
      />
    </div>
  )
})

export const passwordAuthentication = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell space-y-4 bg-background p-8">
      <SshClaudeConnectionFields
        destination="user@company-linux"
        password="fixture-example"
        disabled={false}
        onDestinationChange={() => {}}
        onPasswordChange={() => {}}
      />
    </div>
  )
})

export const terminationUnconfirmed = defineFixture({
  width: 640,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <SshClaudeDiagnosticResultView
        result={{
          ...passed,
          state: 'cancelled',
          stopVerified: false,
          problem: 'stop_unconfirmed',
          steps: [
            { phase: 'connection', state: 'passed' },
            { phase: 'response', state: 'failed', problem: 'stop_unconfirmed' },
            { phase: 'resume', state: 'skipped' },
            { phase: 'cancellation', state: 'skipped' }
          ]
        }}
      />
    </div>
  )
})
