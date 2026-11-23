import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { SettingsRow } from '../form-controls/SettingsFormControls'
import { useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import {
  externalAgentMcpConfig,
  type ExternalAgentConnection,
  type ExternalAgentMcpSetup
} from '../../../../../shared/orchestration/external-agent-clients'

export function ExternalAgentConnections(): React.JSX.Element {
  const [setup, setSetup] = useState<ExternalAgentMcpSetup | null>(null)
  const [clients, setClients] = useState<ExternalAgentConnection[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    let loading = false
    const load = async (): Promise<void> => {
      if (loading) {
        return
      }
      loading = true
      try {
        const [config, list] = await Promise.all([
          callRuntimeRpc<ExternalAgentMcpSetup>(
            { kind: 'local' },
            'externalAgents.setup',
            undefined,
            { signal: controller.signal }
          ),
          callRuntimeRpc<{ clients: ExternalAgentConnection[] }>(
            { kind: 'local' },
            'externalAgents.list',
            undefined,
            { signal: controller.signal }
          )
        ])
        if (!controller.signal.aborted) {
          setSetup(config)
          setClients(list.clients)
          setError('')
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : String(error))
        }
      } finally {
        loading = false
      }
    }
    void load()
    const timer = setInterval(() => void load(), 5000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [])
  return <ExternalAgentConnectionsView setup={setup} clients={clients} error={error} />
}

export function ExternalAgentConnectionsView({
  setup,
  clients,
  error = ''
}: {
  setup: ExternalAgentMcpSetup | null
  clients: ExternalAgentConnection[]
  error?: string
}): React.JSX.Element {
  const t = useTranslate()
  const [client, setClient] = useState<'claude' | 'v1' | 'v2'>('v1')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const config = setup ? externalAgentMcpConfig(setup, client) : ''
  return (
    <SettingsGroup
      title={t('intranet.externalTitle', 'External terminal connections')}
      description={t(
        'intranet.externalDescription',
        'Connect OpenCode or Claude Code running outside Orca with the local Orca MCP server. No website login is required.'
      )}
    >
      <SettingsRow
        label={t('intranet.externalClient', 'Client configuration')}
        control={
          <Select
            value={client}
            onValueChange={(value) => {
              setClient(value as typeof client)
              setCopied(false)
            }}
          >
            <SelectTrigger
              aria-label={t('intranet.externalClient', 'Client configuration')}
              className="w-80 max-w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v1">OpenCode 1.x</SelectItem>
              <SelectItem value="v2">OpenCode 2.x</SelectItem>
              <SelectItem value="claude">Claude Code</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div data-settings-row="" className="space-y-3 py-4">
        <p className="text-settings-detail text-muted-foreground">
          {t(
            'intranet.externalSetupHelp',
            'Merge this entry into the CLI’s MCP configuration, then reconnect its MCP server or restart that CLI. Use the commands on the SSH server when connecting a CLI running there; this computer’s paths do not apply on that server.'
          )}
        </p>
        <Textarea
          aria-label={t('intranet.externalConfig', 'Orca MCP configuration')}
          value={config}
          readOnly
          rows={8}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!config}
          onClick={() => {
            void navigator.clipboard
              .writeText(config)
              .then(() => {
                setCopied(true)
                setCopyError('')
              })
              .catch((error: unknown) =>
                setCopyError(error instanceof Error ? error.message : String(error))
              )
          }}
        >
          <Copy className="size-4" />
          {copied
            ? t('intranet.externalCopied', 'Copied')
            : t('intranet.externalCopy', 'Copy configuration')}
        </Button>
        <p className="text-settings-detail text-muted-foreground">
          {t(
            'intranet.externalPollingHelp',
            'In the external CLI, ask the agent to use orca_list_agents, orca_send and orca_receive. Incoming work is read when the agent calls the receive tool; Orca does not type into an unrelated terminal. Acknowledge processed messages with orca_ack.'
          )}
        </p>
      </div>
      <div data-settings-row="" className="space-y-2 py-4">
        <p className="text-sm font-medium">
          {t('intranet.externalConnected', 'Recently connected MCP clients')}
        </p>
        {clients.length ? (
          <ul className="space-y-3">
            {clients.map((entry) => (
              <li key={entry.address} className="space-y-1">
                <p className="text-sm">
                  {entry.name} · {entry.agent === 'claude' ? 'Claude Code' : 'OpenCode'}
                </p>
                <p className="break-all font-mono text-xs text-muted-foreground">{entry.address}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{entry.cwd}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-settings-detail text-muted-foreground">
            {t('intranet.externalEmpty', 'No external MCP clients are connected.')}
          </p>
        )}
        {error || copyError ? (
          <p role="alert" className="text-sm text-destructive">
            {error || copyError}
          </p>
        ) : null}
      </div>
    </SettingsGroup>
  )
}
