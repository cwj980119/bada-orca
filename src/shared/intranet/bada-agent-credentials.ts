import { BADA_SSO_ISSUER, type BadaCredentials } from './intranet-sso'

export function badaCredentialsFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>
): BadaCredentials | null {
  const expiresAt = Number(environment.ORCA_BADA_TOKEN_EXPIRES_AT)
  if (
    !environment.ORCA_BADA_ACCESS_TOKEN ||
    !environment.ORCA_BADA_SUBJECT ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return null
  }
  return {
    issuer: BADA_SSO_ISSUER,
    subject: environment.ORCA_BADA_SUBJECT,
    name: environment.ORCA_BADA_NAME || null,
    email: environment.ORCA_BADA_EMAIL || null,
    accessToken: environment.ORCA_BADA_ACCESS_TOKEN,
    idToken: environment.ORCA_BADA_ID_TOKEN || null,
    expiresAt
  }
}
