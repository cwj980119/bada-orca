import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import {
  effectiveMcpAuth,
  mcpAuthSecret,
  type IntranetMcpAuth
} from '../../../../../../shared/intranet/intranet-mcp-auth'
import type { IntranetMcpServer } from '../../../../../../shared/intranet/intranet-resources'
import { McpTextField, McpSelectField } from './McpFormField'
import { McpOAuthFields } from './McpOAuthFields'
import { McpSecretField } from './McpSecretField'
import { useMcpAuthentication } from './use-mcp-authentication'

function selectedAuth(method: string): IntranetMcpAuth {
  const secret = { source: 'stored' as const, env: '' }
  if (method === 'oauth' || method === 'client_credentials') {
    return {
      type: 'oauth',
      flow: method === 'oauth' ? 'authorization_code' : 'client_credentials',
      clientId: '',
      scopes: '',
      ...(method === 'client_credentials' ? { clientSecret: secret } : {})
    }
  }
  if (method === 'bearer') {
    return { type: 'bearer', secret }
  }
  if (method === 'api-key') {
    return { type: 'api-key', header: 'X-API-Key', secret }
  }
  if (method === 'basic') {
    return { type: 'basic', username: '', secret }
  }
  return { type: 'none' }
}

export function IntranetMcpAuthentication({
  server,
  onChange
}: {
  server: IntranetMcpServer
  onChange: (auth: IntranetMcpAuth) => void
}): React.JSX.Element {
  const t = useTranslate()
  const auth = effectiveMcpAuth(server)
  const { status, busy, error, run } = useMcpAuthentication(server)
  const secret = mcpAuthSecret(auth)
  const waiting = status?.state === 'authorizing'
  return (
    <div className="space-y-3">
      <McpSelectField
        label={t('intranet.mcp.authMethod', 'Authentication method')}
        value={
          auth.type === 'oauth' && auth.flow === 'client_credentials'
            ? 'client_credentials'
            : auth.type
        }
        onChange={(method) => onChange(selectedAuth(method))}
        options={[
          { value: 'none', label: t('intranet.mcp.none', 'No authentication') },
          { value: 'oauth', label: t('intranet.mcp.oauth', 'OAuth · browser sign-in (PKCE)') },
          {
            value: 'client_credentials',
            label: t(
              'intranet.mcp.clientCredentials',
              'OAuth · service account (Client Credentials)'
            )
          },
          { value: 'bearer', label: 'Bearer token' },
          { value: 'api-key', label: t('intranet.mcp.apiKey', 'API key · custom header') },
          { value: 'basic', label: t('intranet.mcp.basic', 'Basic · username and password') }
        ]}
      />
      {auth.type === 'api-key' ? (
        <McpTextField
          label={t('intranet.mcp.headerName', 'Header name')}
          value={auth.header}
          onChange={(header) => onChange({ ...auth, header })}
          placeholder="X-API-Key"
        />
      ) : null}
      {auth.type === 'basic' ? (
        <McpTextField
          label={t('intranet.mcp.username', 'Username')}
          value={auth.username}
          onChange={(username) => onChange({ ...auth, username })}
        />
      ) : null}
      {auth.type === 'oauth' ? <McpOAuthFields value={auth} onChange={onChange} /> : null}
      {secret ? (
        <McpSecretField
          label={
            auth.type === 'oauth'
              ? 'Client secret'
              : auth.type === 'basic'
                ? t('intranet.mcp.password', 'Password')
                : auth.type === 'api-key'
                  ? t('intranet.mcp.apiKeyValue', 'API key')
                  : 'Bearer token'
          }
          value={secret}
          onChange={(reference) => {
            if (auth.type === 'oauth') {
              onChange({ ...auth, clientSecret: reference })
            } else if (auth.type !== 'none') {
              onChange({ ...auth, secret: reference })
            }
          }}
          saved={status?.hasSecret ?? false}
          busy={busy || waiting}
          onSave={(value) => run('mcpSaveSecret', value)}
          revision={JSON.stringify([server.id, server.url, auth])}
        />
      ) : null}
      {auth.type !== 'none' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {auth.type === 'oauth' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || waiting}
                onClick={() => {
                  void run('mcpSignIn')
                }}
              >
                {busy || waiting ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : null}
                {auth.flow === 'client_credentials'
                  ? t('intranet.mcp.obtainToken', 'Get service token')
                  : t('intranet.mcp.signIn', 'Sign in with browser')}
              </Button>
            ) : null}
            {waiting ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void run('mcpCancel')
                }}
              >
                {t('intranet.mcp.cancel', 'Cancel sign-in')}
              </Button>
            ) : auth.type === 'oauth' || secret?.source === 'stored' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || !(status?.hasSecret || status?.state === 'ready')}
                onClick={() => {
                  void run('mcpSignOut')
                }}
              >
                {t('intranet.mcp.clear', 'Remove saved authentication')}
              </Button>
            ) : null}
          </div>
          <p role="status" className="text-settings-detail text-muted-foreground">
            {waiting
              ? t('intranet.mcp.waiting', 'Waiting for authorization…')
              : status?.state === 'ready'
                ? t(
                    'intranet.mcp.ready',
                    'Authentication is available. The connection will be used when an agent starts.'
                  )
                : t(
                    'intranet.mcp.required',
                    'Provide credentials or sign in to use this connection.'
                  )}
          </p>
          {error || status?.error ? (
            <p role="alert" className="text-settings-detail text-destructive">
              {error || status?.error}
            </p>
          ) : null}
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.mcp.securityHelp',
              'Secrets and OAuth tokens are encrypted on this host. CLI configurations use connection references and require Orca to be running. Authenticated connections require HTTPS; localhost HTTP is supported. Save connections below to apply.'
            )}
          </p>
        </>
      ) : null}
    </div>
  )
}
