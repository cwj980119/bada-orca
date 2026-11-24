import type { Translate } from '@/i18n/use-translate'

export function ssoSettingError(
  issue: { path: readonly PropertyKey[]; message: string },
  t: Translate
): string {
  const key = String(issue.path[1] ?? '')
  const labels: Record<string, string> = {
    issuer: 'Issuer URL',
    clientId: 'Client ID',
    clientSecretEnv: 'Client secret environment variable',
    scopes: 'Scopes',
    authorizationUrl: 'Authorization endpoint',
    tokenUrl: 'Token endpoint',
    userInfoUrl: 'User profile endpoint',
    subjectClaim: 'User ID field',
    callbackPort: 'Callback port'
  }
  const field = t(`intranet.sso.${key}`, labels[key] ?? t('intranet.sso.title', 'BADA sign-in'))
  if (key === 'clientSecretEnv') {
    return t(
      'intranet.sso.invalidSecretEnv',
      'Enter an environment variable name, such as ORCA_BADA_CLIENT_SECRET.'
    )
  }
  if (key === 'callbackPort') {
    return t('intranet.sso.invalidPort', 'Use a port between 1024 and 65535.')
  }
  if (key === 'scopes') {
    return t(
      'intranet.sso.invalidScopes',
      'OIDC requires the openid scope. Check the requested scopes.'
    )
  }
  if (issue.message === 'Required for company sign-in.') {
    return t('intranet.sso.requiredField', 'Enter {{field}} before enabling BADA sign-in.', {
      field
    })
  }
  return t(
    'intranet.sso.invalidField',
    'Check {{field}}. Server URLs must use HTTPS or the configured BADA address without credentials, a query, or a fragment.',
    { field }
  )
}
