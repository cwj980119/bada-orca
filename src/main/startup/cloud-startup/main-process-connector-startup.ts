import type { ConnectorCloud } from '../../connector-cloud/connector-cloud'

export function installMainProcessConnectorCloud(_serve: boolean): void {}

export function mainProcessConnectorCloud(): ConnectorCloud | null {
  return null
}

export function fenceMainProcessCloudOnQuit(): void {}

export function connectMainProcessConnectorCloud(): void {}
