export function jiraGatewayBaseUrl(_cloudId: unknown): string {
  throw new Error('This service is not included in the internal edition.')
}

export function isJiraGatewayBaseUrl(_value: unknown): _value is string {
  return false
}
