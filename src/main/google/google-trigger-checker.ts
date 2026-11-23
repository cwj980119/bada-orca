import type { AutomationRunEvent } from '../../shared/automation-event-triggers'
import type { Automation } from '../../shared/automations/automation-definition'
import type { Bot } from '../../shared/bot-types'
import type { GoogleApi } from './google-api-client'

import type { GoogleTriggerState } from './google-trigger-state'

type Timer = ReturnType<typeof setTimeout>

export type GoogleTriggerCheckerDeps = {
  automations(): readonly Pick<Automation, 'id' | 'enabled' | 'bot' | 'on'>[]
  bots(): readonly Pick<Bot, 'id' | 'google'>[]

  accounts(): string[]
  api(account: string): GoogleApi
  runForEvent(automationId: string, event: AutomationRunEvent): Promise<unknown>
  readState(): GoogleTriggerState
  writeState(state: GoogleTriggerState): void
  now(): number
  tickMs: number
  setTimer?(run: () => void, ms: number): Timer
  clearTimer?(timer: Timer): void
}

export class GoogleTriggerChecker {
  constructor(_deps: GoogleTriggerCheckerDeps) {}

  tick(): Promise<void> {
    return Promise.resolve()
  }

  stop(): void {}
}
