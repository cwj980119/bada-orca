import type { LinearClient, LinearClientOptions, LinearError } from '@linear/sdk'

export type LinearSdkModule = {
  LinearClient: new (options: LinearClientOptions) => LinearClient
  AuthenticationLinearError: new (...args: never[]) => Error
  parseLinearError: (error: unknown) => Error
  LinearError: new (...args: never[]) => LinearError
}

export function loadLinearSdk(): LinearSdkModule {
  throw new Error('This service is not included in the internal edition.')
}

export type LinearClientCreateOptions = LinearClientOptions & {
  reauthorize?: () => Promise<string | null>
}

export function createLinearClient(_options: LinearClientCreateOptions): LinearClient {
  throw new Error('This service is not included in the internal edition.')
}
