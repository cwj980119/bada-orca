import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsGroup } from '../../section-layout/SettingsGroup'
import { useIntranetSso } from './use-intranet-sso'
import { INTRANET_SSO_SETTINGS_TARGET_ID } from '../../navigation/settings-navigation-types'

export function IntranetSsoSettings(): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const auth = useIntranetSso('bada')
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
  return (
    <SettingsGroup
      id={INTRANET_SSO_SETTINGS_TARGET_ID}
      title={t('intranet.sso.title', 'BADA sign-in')}
      description={t(
        'intranet.sso.description',
        'Sign in with BADA to connect your account to Orca and company tools.'
      )}
    >
      <div data-settings-row="" className="space-y-3 py-3">
        {auth.status?.identity ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {auth.status.identity.name ?? auth.status.identity.subject}
            </p>
            {auth.status.identity.email ? (
              <p className="text-settings-detail text-muted-foreground">
                {auth.status.identity.email}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{t(`intranet.sso.states.${state}`, stateLabels[state])}</Badge>
          {state === 'signed-in' && auth.status?.identity ? (
            <span className="text-settings-detail text-muted-foreground">
              {t('intranet.sso.expires', 'Valid until {{time}}', {
                time: new Date(auth.status.identity.expiresAt).toLocaleString(locale)
              })}
            </span>
          ) : null}
        </div>
        {auth.status?.error || auth.error ? (
          <p role="alert" className="text-settings-detail text-destructive">
            {t(
              `intranet.sso.errors.${auth.status?.error ?? 'unavailable'}`,
              'Could not read BADA sign-in status. Retry in the updated desktop app.'
            )}
          </p>
        ) : null}
        {state === 'unconfigured' ? (
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.sso.buildRequired',
              'BADA sign-in is not configured in this build. Contact your administrator.'
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
              disabled={auth.busy || state === 'loading' || state === 'unconfigured'}
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
        </div>
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
