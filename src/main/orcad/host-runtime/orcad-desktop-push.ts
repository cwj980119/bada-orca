import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import type { OrcaRuntimeRpcServer } from '../../runtime/rpc/server/runtime-rpc'

/** Phones register push tokens with this host; the service stops when orcad quits. */
export function startOrcadDesktopPushService(
  _runtime: OrcaRuntimeService,
  _runtimeRpc: OrcaRuntimeRpcServer
): void {}
