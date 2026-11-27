import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useTranslate } from '@/i18n/use-translate'
import type { IntranetMcpAuth } from '../../../../../../shared/intranet/intranet-mcp-auth'
import { McpTextField } from './McpFormField'

export function McpOAuthFields({
  value,
  onChange
}: {
  value: Extract<IntranetMcpAuth, { type: 'oauth' }>
  onChange: (value: IntranetMcpAuth) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="space-y-3">
      <p className="text-settings-detail text-muted-foreground">
        {value.flow === 'authorization_code'
          ? t(
              'intranet.mcp.discovery',
              'Orca discovers the authorization server from MCP metadata. Leave Client ID blank for automatic client registration when the server supports it.'
            )
          : t(
              'intranet.mcp.serviceDiscovery',
              'The MCP server must support the Client Credentials flow. Enter the registered service account Client ID and secret.'
            )}
      </p>
      <McpTextField
        label={t('intranet.mcp.clientId', 'Client ID')}
        value={value.clientId}
        onChange={(clientId) => onChange({ ...value, clientId })}
      />
      <McpTextField
        label={t('intranet.mcp.scopes', 'Scopes (space-separated, optional)')}
        value={value.scopes}
        onChange={(scopes) => onChange({ ...value, scopes })}
        placeholder="mcp:read mcp:write offline_access"
      />
      <Collapsible
        defaultOpen={Boolean(value.issuer || value.clientMetadataUrl || value.callbackPort)}
        className="space-y-3"
      >
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            {t('intranet.mcp.advanced', 'Advanced OAuth settings')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          <McpTextField
            label={t('intranet.mcp.issuer', 'Authorization server URL (optional override)')}
            value={value.issuer ?? ''}
            onChange={(issuer) => onChange({ ...value, issuer })}
            placeholder="https://auth.company.internal"
          />
          {value.flow === 'authorization_code' ? (
            <McpTextField
              label={t('intranet.mcp.metadataUrl', 'Client metadata URL (CIMD, optional)')}
              value={value.clientMetadataUrl ?? ''}
              onChange={(clientMetadataUrl) => onChange({ ...value, clientMetadataUrl })}
              placeholder="https://company.internal/orca-client.json"
            />
          ) : null}
          {value.flow === 'authorization_code' ? (
            <>
              <McpTextField
                label={t('intranet.mcp.callbackPort', 'Callback port')}
                value={String(value.callbackPort ?? 48276)}
                type="number"
                onChange={(port) =>
                  onChange({ ...value, callbackPort: port ? Number(port) : undefined })
                }
              />
              <p className="break-all font-mono text-xs text-muted-foreground">
                http://127.0.0.1:{value.callbackPort ?? 48276}/oauth/mcp/callback
              </p>
            </>
          ) : null}
          {value.flow === 'authorization_code' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...value,
                  clientSecret: value.clientSecret ? undefined : { source: 'stored', env: '' }
                })
              }
            >
              {value.clientSecret
                ? t('intranet.mcp.removeClientSecret', 'Use a public client without a secret')
                : t('intranet.mcp.addClientSecret', 'Add a client secret')}
            </Button>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
