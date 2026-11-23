import type { z } from 'zod'
import type {
  ComposioApp,
  ComposioAppPage,
  ComposioConnection
} from '../../shared/composio/composio-apps'
import type { ComposioWebhookSubscription } from './composio-api-answers'

export {
  ComposioKeyRejectedError,
  ComposioLimitError,
  ComposioNeedsOwnSignInError,
  ComposioUnavailableError
} from './composio-api-errors'

type Fetch = typeof fetch

export class ComposioApi {
  constructor(_key: string, _fetchImpl: Fetch = fetch) {}

  send<T>(
    _path: string,
    _schema: z.ZodType<T>,
    _init?: { method?: string; body?: unknown }
  ): Promise<T> {
    throw new Error('This service is not included in the internal edition.')
  }

  async apps(_options: {
    search?: string
    cursor?: string
    limit?: number
  }): Promise<ComposioAppPage> {
    throw new Error('This service is not included in the internal edition.')
  }

  async app(_slug: string): Promise<ComposioApp> {
    throw new Error('This service is not included in the internal edition.')
  }

  async createSession(_userId: string): Promise<{ id: string; mcpUrl: string }> {
    throw new Error('This service is not included in the internal edition.')
  }

  async refreshSession(_sessionId: string): Promise<boolean> {
    throw new Error('This service is not included in the internal edition.')
  }

  async triggers(_userId: string): Promise<{ id: string; trigger: string }[]> {
    throw new Error('This service is not included in the internal edition.')
  }

  async deleteTrigger(_id: string): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }

  async authConfigApps(): Promise<Map<string, string>> {
    throw new Error('This service is not included in the internal edition.')
  }

  async useAuthConfig(_sessionId: string, _app: string, _authConfigId: string): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }

  async connectLink(_sessionId: string, _app: string): Promise<{ url: string; accountId: string }> {
    throw new Error('This service is not included in the internal edition.')
  }

  async disconnectOthers(_userId: string, _kept: ComposioConnection): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }

  async connections(_userId: string): Promise<ComposioConnection[]> {
    throw new Error('This service is not included in the internal edition.')
  }

  async connection(_accountId: string): Promise<ComposioConnection> {
    throw new Error('This service is not included in the internal edition.')
  }

  async webhookSubscriptions(): Promise<ComposioWebhookSubscription[]> {
    throw new Error('This service is not included in the internal edition.')
  }

  async sendEventsTo(_url: string, _replacing?: string): Promise<ComposioWebhookSubscription> {
    throw new Error('This service is not included in the internal edition.')
  }

  async rotateSecret(_id: string): Promise<string | null> {
    throw new Error('This service is not included in the internal edition.')
  }

  async triggerType(_trigger: string): Promise<{ name: string; app: string }> {
    throw new Error('This service is not included in the internal edition.')
  }

  async triggerOn(_userId: string, _trigger: string): Promise<boolean> {
    throw new Error('This service is not included in the internal edition.')
  }

  async turnOnTrigger(
    _userId: string,
    _trigger: string,
    _config: Record<string, unknown>
  ): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }

  async disconnect(_accountId: string): Promise<void> {
    throw new Error('This service is not included in the internal edition.')
  }
}
