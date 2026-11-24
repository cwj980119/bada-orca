import { useId } from 'react'
import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  badaSsoSettings,
  BADA_SSO_ISSUER,
  BADA_SSO_CLIENT_SECRET_ENV,
  DEFAULT_INTRANET_SSO_CALLBACK_PORT,
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
  const config = badaSsoSettings(value)
  const saved = badaSsoSettings(savedValue)
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)
  const auth = useIntranetSso(JSON.stringify(saved))
  const edit = <K extends keyof SsoSettings>(key: K, next: SsoSettings[K]) =>
    onChange(badaSsoSettings({ ...config, [key]: next }))
  const state = auth.status?.state ?? 'loading'
  const stateLabels = {
    loading: 'Loading',
    unconfigured: 'Not configured',
    'signed-out': 'Signed out',
    authorizing: 'Waiting for BADA sign-in',
    'signed-in': 'Signed in',
    expired: 'Sign-in expired',
    error: 'Sign-in failed'
  }
  const problem = auth.status?.error
  return (
    <SettingsGroup
      id={INTRANET_SSO_SETTINGS_TARGET_ID}
      title={t('intranet.sso.title', 'BADA sign-in')}
      description={t(
        'intranet.sso.description',
        'Sign in through BADA on the company network. Save your issued Client ID before signing in.'
      )}
    >
      <SettingsRow
        label={t('intranet.sso.issuer', 'Issuer URL')}
        control={
          <span className="break-all font-mono text-settings-detail">{BADA_SSO_ISSUER}</span>
        }
      />
      <SettingsRow
        label={t('intranet.sso.clientId', 'Client ID')}
        labelId={`${id}-clientId-label`}
        control={
          <Input
            aria-labelledby={`${id}-clientId-label`}
            value={config.clientId}
            onChange={(event) => edit('clientId', event.target.value)}
            className="w-80 max-w-full"
            autoComplete="off"
          />
        }
      />
      <SettingsRow
        label={t('intranet.sso.clientSecretEnv', 'Client secret environment variable')}
        labelId={`${id}-clientSecretEnv-label`}
        description={t(
          'intranet.sso.secretHelp',
          'Set the issued secret in this environment variable on the PC running Orca, then restart the app. Enter the variable name here.'
        )}
        control={
          <Input
            aria-labelledby={`${id}-clientSecretEnv-label`}
            value={config.clientSecretEnv}
            onChange={(event) => edit('clientSecretEnv', event.target.value)}
            placeholder={BADA_SSO_CLIENT_SECRET_ENV}
            className="w-80 max-w-full"
            autoComplete="off"
            spellCheck={false}
          />
        }
      />
      <SettingsRow
        label={t('intranet.sso.tokenEndpointAuthMethod', 'Client authentication')}
        control={
          <Select
            value={config.tokenEndpointAuthMethod}
            onValueChange={(method: SsoSettings['tokenEndpointAuthMethod']) =>
              edit('tokenEndpointAuthMethod', method)
            }
          >
            <SelectTrigger
              className="w-80 max-w-full"
              aria-label={t('intranet.sso.tokenEndpointAuthMethod', 'Client authentication')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client_secret_basic">
                {t('intranet.sso.clientSecretBasic', 'client_secret_basic')}
              </SelectItem>
              <SelectItem value="client_secret_post">
                {t('intranet.sso.clientSecretPost', 'client_secret_post')}
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div
        data-settings-row=""
        className="space-y-2 py-3 text-settings-detail text-muted-foreground"
      >
        <p>
          {t('intranet.sso.scopes', 'Scopes')}: <span className="font-mono">{config.scopes}</span>
        </p>
        <p>{t('intranet.sso.callbackHelp', 'Register this fixed redirect URI with BADA:')}</p>
        <p className="break-all font-mono">
          http://127.0.0.1:{DEFAULT_INTRANET_SSO_CALLBACK_PORT}
          {INTRANET_SSO_CALLBACK_PATH}
        </p>
      </div>
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
              'Could not read BADA sign-in status. Retry in the updated desktop app.'
            )}
          </p>
        ) : null}
        {dirty ? (
          <p className="text-settings-detail text-muted-foreground">
            {t('intranet.sso.saveFirst', 'Save the connection settings below before signing in.')}
          </p>
        ) : !saved.enabled ? (
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.sso.credentialsRequired',
              'Save the Client ID issued by BADA to enable sign-in.'
            )}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {state === 'authorizing' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={auth.busy}
              onClick={() => void auth.run('intranet.ssoCancel')}
            >
              {t('intranet.sso.cancel', 'Cancel sign-in')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!saved.enabled || dirty || auth.busy}
              onClick={() => void auth.run('intranet.ssoSignIn')}
            >
              {auth.busy ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <LogIn className="size-4" />
              )}
              {t('intranet.sso.signIn', 'BADA sign-in')}
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
            'BADA sign-in connects your app account. CLI and model authentication use their existing settings. Disconnecting does not sign the browser out of BADA.'
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
