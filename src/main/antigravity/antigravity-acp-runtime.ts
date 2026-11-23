import { join } from 'node:path'
import type { ManagedRuntime, ManagedRuntimePin } from '../node-runtime/managed-runtime-release'
import { probeAntigravityAcpServer } from './antigravity-acp-runtime-probe'
const COMMAND = process.platform === 'win32' ? 'agy_acp_server.exe' : 'agy_acp_server.par'

function pin(): ManagedRuntimePin | null {
  return null
}

export const ANTIGRAVITY_ACP_COMMAND = COMMAND
export const ANTIGRAVITY_ACP_RUNTIME: ManagedRuntime = {
  label: 'Antigravity',
  root: (dataDirectory) => join(dataDirectory, 'agent-runtimes', 'antigravity'),
  pin,
  validate: (folder, pinned, signal) =>
    probeAntigravityAcpServer(join(folder, COMMAND), pinned.version, signal)
}
