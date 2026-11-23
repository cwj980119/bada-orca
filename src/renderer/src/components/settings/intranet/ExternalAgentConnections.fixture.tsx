import { defineFixture } from '../../../component-fixtures/component-fixture'
import { ExternalAgentConnectionsView } from './ExternalAgentConnections'

export const connected = defineFixture({
  width: 720,
  render: () => (
    <div className="settings-view-shell bg-background p-8">
      <ExternalAgentConnectionsView
        setup={{
          command: 'node',
          args: ['/company/orca/out/cli/index.js', 'external-agent-mcp'],
          env: { ORCA_USER_DATA_PATH: '/company/orca/profile' }
        }}
        clients={[
          {
            address: 'external:code-session',
            agent: 'opencode',
            name: 'OpenCode · API 구현',
            cwd: '/workspace/api',
            last_seen: 1
          },
          {
            address: 'external:review-session',
            agent: 'claude',
            name: 'Claude Code · 리뷰',
            cwd: '/workspace/api',
            last_seen: 1
          }
        ]}
      />
    </div>
  )
})
