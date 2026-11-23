import type { OptInVia } from '../../shared/telemetry/schemas/telemetry-property-schemas'
import type * as events from '../../shared/telemetry/telemetry-event-classification'
import type { Store } from '../persistence/loading-store/store'

export function shouldOptOutSdkAtInit(): boolean {
  return true
}

export function initTelemetry(_store: Store, _scheduleStart: (start: () => void) => void): void {}

export const isTelemetryInitialized = (): boolean => {
  return false
}

export function isTelemetryEnabled(): boolean {
  return false
}

export function hasTrackedAgentDashboardActiveToday(_props: unknown): boolean {
  return false
}

export function track<N extends events.EventName>(_name: N, _props: events.EventProps<N>): boolean {
  return false
}

export async function setOptIn(_via: OptInVia, _optedIn: boolean): Promise<void> {}

export async function persistBannerAcknowledgeWithoutEmitting(): Promise<void> {}

export function trackAppOpenedOnce(): void {}

export async function shutdownTelemetry(): Promise<void> {}

export function _setPostHogClientForTests(_client: unknown): void {}

export function _setCommonPropsForTests(_props: events.CommonProps | null): void {}

export function _setStoreForTests(_store: Store | null): void {}

export function _setShuttingDownForTests(_value: boolean): void {}

export function _enableTransportForTests(_enabled: boolean): void {}

export function _resetFirstAppOpenedFiredForTests(): void {}
