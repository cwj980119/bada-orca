// Return best-effort gateway outcomes instead of throwing through notification fan-out.
import { z } from 'zod'

import type { E2EEKeypair } from '../rpc/server/pairing/e2ee-keypair'
import type {
  MobilePushAgentState,
  MobilePushApnsEnvironment,
  MobilePushPlatform,
  MobilePushSource
} from '../../../shared/notifications/mobile-push-contract'
import type { PushGatewayResult } from './push-gateway-response'

const SendResponseSchema = z.object({
  results: z
    .array(
      z.object({
        registrationId: z.string().min(1).max(512),
        status: z.enum(['queued', 'dead', 'rate_limited', 'error'])
      })
    )
    .max(64)
})

export type PushSendResult = z.infer<typeof SendResponseSchema>['results'][number]

export type PushSendNotification = {
  kind?: 'alert' | 'dismiss'
  expiresAt?: number
  sound?: boolean
  notificationId?: string
  notificationSeq: number
  notificationEpoch: string
  source: MobilePushSource
  agentState: MobilePushAgentState | null
  title: string
  body: string
  worktreeId?: string
  paneKey?: string
  executionHost?: `runtime:${string}`
}

type PushGatewayClientOptions = {
  gatewayUrl: string
  keypair: E2EEKeypair
  fetch?: typeof globalThis.fetch
  now?: () => number
}

export class PushGatewayClient {
  constructor(_options: PushGatewayClientOptions) {}

  async registerDevice(_input: {
    deviceId: string
    platform: MobilePushPlatform
    token: string
    apnsEnvironment?: MobilePushApnsEnvironment
  }): Promise<PushGatewayResult<{ registrationId: string }>> {
    return { ok: false, reason: 'unreachable' }
  }

  async deleteDevice(_registrationId: string): Promise<boolean> {
    return false
  }

  async send(_input: {
    registrationIds: readonly string[]
    notification: PushSendNotification
  }): Promise<PushGatewayResult<{ results: readonly PushSendResult[] }>> {
    return { ok: false, reason: 'unreachable' }
  }
}
