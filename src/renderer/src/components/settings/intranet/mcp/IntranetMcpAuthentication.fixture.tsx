import { useState } from 'react'
import { defineFixture } from '../../../../component-fixtures/component-fixture'
import { setRendererUiLanguage } from '@/i18n/i18n'
import { IntranetMcpServerEditor } from '../IntranetMcpServerEditor'
import type { IntranetMcpAuth } from '../../../../../../shared/intranet/intranet-mcp-auth'
import type { IntranetMcpServer } from '../../../../../../shared/intranet/intranet-resources'

function setup(): void {
  void setRendererUiLanguage('ko')
  const original = window.api.runtime.call
  window.api.runtime.call = async (request) =>
    request.method.startsWith('intranet.mcp')
      ? {
          id: 'fixture',
          ok: true,
          result: { state: 'signed-out', hasSecret: false },
          _meta: { runtimeId: 'fixture' }
        }
      : original(request)
}
function Preview({ auth }: { auth: IntranetMcpAuth }): React.JSX.Element {
  const [server, setServer] = useState<IntranetMcpServer>({
    id: 'company-wiki',
    name: '사내 위키',
    purpose: 'knowledge',
    enabled: true,
    transport: 'http',
    url: 'https://wiki.company.internal/mcp',
    command: '',
    args: [],
    tokenEnv: '',
    auth
  })
  return (
    <div className="settings-view-shell bg-background p-8">
      <IntranetMcpServerEditor value={server} onChange={setServer} onRemove={() => {}} />
    </div>
  )
}
export const oauth = defineFixture({
  width: 720,
  setup,
  render: () => (
    <Preview auth={{ type: 'oauth', flow: 'authorization_code', clientId: '', scopes: '' }} />
  )
})
export const apiKey = defineFixture({
  width: 720,
  setup,
  render: () => (
    <Preview
      auth={{ type: 'api-key', header: 'X-API-Key', secret: { source: 'stored', env: '' } }}
    />
  )
})
export const serviceAccount = defineFixture({
  width: 720,
  setup,
  render: () => (
    <Preview
      auth={{
        type: 'oauth',
        flow: 'client_credentials',
        clientId: 'orca-service',
        scopes: 'mcp:read',
        clientSecret: { source: 'env', env: 'MCP_CLIENT_SECRET' }
      }}
    />
  )
})
export const narrowBasic = defineFixture({
  width: 360,
  setup,
  render: () => (
    <Preview
      auth={{ type: 'basic', username: 'employee', secret: { source: 'stored', env: '' } }}
    />
  )
})
