import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTranslate } from '@/i18n/use-translate'
import type { IntranetSsoSettings } from '../../../../../../shared/intranet/intranet-sso'
import {
  INTRANET_SSO_CALLBACK_PATH,
  intranetSsoCallbackPort
} from '../../../../../../shared/intranet/intranet-sso'

export function BadaSignInConfiguration({
  value,
  onChange,
  secret,
  onSecretChange,
  disabled
}: {
  value: IntranetSsoSettings
  onChange: (value: IntranetSsoSettings) => void
  secret: string
  onSecretChange: (value: string) => void
  disabled: boolean
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <fieldset disabled={disabled} className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="bada-issuer">{t('intranet.sso.issuer', 'OIDC issuer URL')}</Label>
        <Input
          id="bada-issuer"
          value={value.issuer}
          onChange={(event) => onChange({ ...value, issuer: event.target.value })}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bada-client-id">{t('intranet.sso.clientId', 'Client ID')}</Label>
        <Input
          id="bada-client-id"
          value={value.clientId}
          onChange={(event) => onChange({ ...value, clientId: event.target.value })}
          className="font-mono"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bada-auth-method">
          {t('intranet.sso.authMethod', 'Client authentication')}
        </Label>
        <Select
          value={value.tokenEndpointAuthMethod}
          onValueChange={(method) =>
            onChange({
              ...value,
              tokenEndpointAuthMethod: method as IntranetSsoSettings['tokenEndpointAuthMethod']
            })
          }
        >
          <SelectTrigger id="bada-auth-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {t('intranet.sso.publicClientOption', 'Public client (PKCE)')}
            </SelectItem>
            <SelectItem value="client_secret_basic">Client secret (Basic)</SelectItem>
            <SelectItem value="client_secret_post">Client secret (POST)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.tokenEndpointAuthMethod !== 'none' ? (
        <div className="space-y-1.5">
          <Label htmlFor="bada-client-secret">
            {t('intranet.sso.clientSecret', 'Client secret')}
          </Label>
          <Input
            id="bada-client-secret"
            type="password"
            value={secret}
            onChange={(event) => onSecretChange(event.target.value)}
            autoComplete="new-password"
          />
          <p className="text-settings-detail text-muted-foreground">
            {t(
              'intranet.sso.secretStorage',
              'Stored with your session using the operating system’s protected storage. Leave blank to use an existing secret.'
            )}
          </p>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="bada-scopes">{t('intranet.sso.scopes', 'Scopes')}</Label>
        <Input
          id="bada-scopes"
          value={value.scopes}
          onChange={(event) => onChange({ ...value, scopes: event.target.value })}
          className="font-mono"
        />
        <p className="text-settings-detail text-muted-foreground">
          {t(
            'intranet.sso.refreshHelp',
            'Request offline_access to stay signed in when the identity provider supports refresh tokens.'
          )}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bada-redirect-uri">{t('intranet.sso.redirectUri', 'Redirect URI')}</Label>
        <Input
          id="bada-redirect-uri"
          readOnly
          className="font-mono"
          value={`http://127.0.0.1:${intranetSsoCallbackPort(value.callbackPort)}${INTRANET_SSO_CALLBACK_PATH}`}
        />
      </div>
    </fieldset>
  )
}
