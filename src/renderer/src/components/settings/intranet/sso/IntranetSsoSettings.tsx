import { useId } from 'react'
import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { SettingsGroup } from '../../section-layout/SettingsGroup'
import { SettingsRow } from '../../form-controls/SettingsFormControls'
import {
  defaultIntranetSsoSettings,
  DEFAULT_INTRANET_SSO_CALLBACK_PORT,
  intranetSsoCallbackPort,
  INTRANET_SSO_CALLBACK_PATH,
  type IntranetSsoSettings as SsoSettings
} from '../../../../../../shared/intranet/intranet-sso'
import { useIntranetSso } from './use-intranet-sso'
import { INTRANET_SSO_SETTINGS_TARGET_ID } from '../../navigation/settings-navigation-types'

export function IntranetSsoSettings({
  value,
  savedValue,
  onChange
}: {
  value: SsoSettings | undefined
  savedValue: SsoSettings | undefined
  onChange: (value: SsoSettings) => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const id = useId()
  const config = value ?? defaultIntranetSsoSettings()
  const saved = savedValue ?? defaultIntranetSsoSettings()
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)
  const auth = useIntranetSso(JSON.stringify(saved))
  const edit = <K extends keyof SsoSettings>(key: K, next: SsoSettings[K]) =>
    onChange({ ...config, [key]: next })
  const field = (
    key:
      | 'label'
      | 'issuer'
      | 'clientId'
      | 'scopes'
      | 'authorizationUrl'
      | 'tokenUrl'
      | 'userInfoUrl'
      | 'subjectClaim',
    label: string,
    placeholder = ''
  ) => (
    <SettingsRow
      key={key}
      label={label}
      labelId={`${id}-${key}-label`}
      control={
        <Input
          id={`${id}-${key}`}
          aria-labelledby={`${id}-${key}-label`}
          value={config[key]}
          onChange={(event) => edit(key, event.target.value)}
          placeholder={placeholder}
          className="w-80 max-w-full"
          autoComplete="off"
        />
      }
    />
  )
  const state = auth.status?.state ?? 'loading'
  const stateLabels = {
    loading: 'Loading',
    unconfigured: 'Not configured',
    'signed-out': 'Signed out',
    authorizing: 'Waiting for company sign-in',
    'signed-in': 'Signed in',
    expired: 'Sign-in expired',
    error: 'Sign-in failed'
  }
  const problem = auth.status?.error
  return (
    <SettingsGroup
      id={INTRANET_SSO_SETTINGS_TARGET_ID}
      title={t('intranet.sso.title', 'Company account · SSO')}
      description={t(
        'intranet.sso.description',
        'Connect this app to your company identity provider. Configure the server later; no Orca account is needed.'
      )}
    >
      <SettingsRow
        label={t('intranet.sso.enabled', 'Enable company sign-in')}
        control={
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => edit('enabled', enabled)}
            aria-label={t('intranet.sso.enabled', 'Enable company sign-in')}
          />
        }
      />
      {config.enabled ? (
        <>
          {field('label', t('intranet.sso.label', 'Provider display name'))}
          <SettingsRow
            label={t('intranet.sso.protocol', 'Authentication protocol')}
            control={
              <Select
                value={config.protocol}
                onValueChange={(protocol: SsoSettings['protocol']) =>
                  onChange({
                    ...config,
                    protocol,
                    scopes: protocol === 'oidc' ? 'openid profile email' : ''
                  })
                }
              >
                <SelectTrigger
                  className="w-80 max-w-full"
                  aria-label={t('intranet.sso.protocol', 'Authentication protocol')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oidc">OpenID Connect (OIDC)</SelectItem>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          {config.protocol === 'oidc' ? (
            field('issuer', t('intranet.sso.issuer', 'Issuer URL'), 'https://sso.company.internal')
          ) : (
            <>
              {field(
                'authorizationUrl',
                t('intranet.sso.authorizationUrl', 'Authorization endpoint')
              )}
              {field('tokenUrl', t('intranet.sso.tokenUrl', 'Token endpoint'))}
              {field('userInfoUrl', t('intranet.sso.userInfoUrl', 'User profile endpoint'))}
              {field('subjectClaim', t('intranet.sso.subjectClaim', 'User ID field'), 'sub')}
            </>
          )}
          {field('clientId', t('intranet.sso.clientId', 'Client ID'))}
          {field(
            'scopes',
            t('intranet.sso.scopes', 'Scopes'),
            config.protocol === 'oidc' ? 'openid profile email' : ''
          )}
          <SettingsRow
            label={t('intranet.sso.callbackPort', 'Callback port')}
            control={
              <Input
                type="number"
                min={1024}
                max={65535}
                value={intranetSsoCallbackPort(config.callbackPort)}
                onChange={(event) =>
                  edit(
                    'callbackPort',
                    event.target.valueAsNumber || DEFAULT_INTRANET_SSO_CALLBACK_PORT
                  )
                }
                aria-label={t('intranet.sso.callbackPort', 'Callback port')}
                className="w-32"
              />
            }
          />
          <div
            data-settings-row=""
            className="space-y-2 py-3 text-settings-detail text-muted-foreground"
          >
            <p>
              {t(
                'intranet.sso.callbackHelp',
                'The callback port is fixed (default: {{port}}). Register the exact URL below. If you change the port, update the identity provider registration too.',
                { port: DEFAULT_INTRANET_SSO_CALLBACK_PORT }
              )}
            </p>
            <p className="break-all font-mono">
              http://127.0.0.1:{intranetSsoCallbackPort(config.callbackPort)}
              {INTRANET_SSO_CALLBACK_PATH}
            </p>
            <p>
              {t(
                'intranet.sso.publicClient',
                'Uses a native/public client with Authorization Code + PKCE (S256). No client secret is embedded. Providers requiring a client secret need a company backend adapter.'
              )}
            </p>
          </div>
        </>
      ) : null}
      <div data-settings-row="" className="space-y-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(`intranet.sso.states.${state}`, stateLabels[state])}</Badge>
          {auth.status?.identity ? (
            <span className="break-all text-settings-detail">
              {auth.status.identity.name ?? auth.status.identity.subject}
              {auth.status.identity.email ? ` · ${auth.status.identity.email}` : ''}
            </span>
          ) : null}
        </div>
        {auth.status?.identity && state === 'signed-in' ? (
          <p className="text-settings-detail text-muted-foreground">
            {t('intranet.sso.expires', 'Valid until {{time}}', {
              time: new Date(auth.status.identity.expiresAt).toLocaleString(locale)
            })}
          </p>
        ) : null}
        {problem || auth.error ? (
          <p role="alert" className="text-settings-detail text-destructive">
            {t(
              `intranet.sso.errors.${problem ?? 'unavailable'}`,
              'Could not complete company sign-in. Check the saved settings and try again.'
            )}
          </p>
        ) : null}
        {dirty ? (
          <p className="text-settings-detail text-muted-foreground">
            {t('intranet.sso.saveFirst', 'Save the connection settings below before signing in.')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {state === 'authorizing' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={auth.busy}
              onClick={() => void auth.run('intranet.ssoCancel')}
            >
              {t('intranet.sso.cancel', 'Cancel sign-in')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!saved.enabled || dirty || auth.busy}
              onClick={() => void auth.run('intranet.ssoSignIn')}
            >
              {auth.busy ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <LogIn className="size-4" />
              )}
              {t('intranet.sso.signIn', 'Sign in with company account')}
            </Button>
          )}
          {auth.status?.identity ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={auth.busy}
              onClick={() => void auth.run('intranet.ssoSignOut')}
            >
              <LogOut className="size-4" />
              {t('intranet.sso.signOut', 'Disconnect account')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={auth.busy}
            onClick={() => void auth.run('intranet.ssoStatus')}
          >
            {t('intranet.sso.refresh', 'Refresh status')}
          </Button>
        </div>
        <p className="text-settings-detail text-muted-foreground">
          {t(
            'intranet.sso.scopeHelp',
            'This connects the app identity. It does not automatically sign CLI tools, models or MCP servers in, or require sign-in to use the app. Tokens are used only during sign-in; only the verified account and expiry are retained. Disconnecting does not sign the browser out of company SSO.'
          )}
        </p>
        {state === 'signed-in' && auth.status?.persistence === 'memory' ? (
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.sso.memory',
              'Secure storage is unavailable. This sign-in is kept in memory until the app exits.'
            )}
          </p>
        ) : null}
      </div>
    </SettingsGroup>
  )
}
