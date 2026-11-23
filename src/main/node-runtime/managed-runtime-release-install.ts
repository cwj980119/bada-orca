import type { ManagedRuntimeOperation } from '../../shared/agent-launch/installation/managed-runtime-install'
import type { MainHttpClient } from '../network/http-client'

import type { ManagedRuntime, ManagedRuntimePin } from './managed-runtime-release'

export type RuntimeReleaseInstall = {
  agent: string
  runtime: Pick<ManagedRuntime, 'label' | 'validate'>
  root: string
  pin: ManagedRuntimePin
  fetcher?: MainHttpClient['fetch']
  signal: AbortSignal
  publish: (patch: Partial<ManagedRuntimeOperation>) => void

  commit: () => void
}

export async function installRuntimeRelease(_input: RuntimeReleaseInstall): Promise<void> {
  throw new Error('This service is not included in the internal edition.')
}

export function installFailureText(label: string, error: unknown, deadline: AbortSignal): string {
  const message = error instanceof Error ? error.message : String(error)
  if (deadline.aborted) {
    return `Installing ${label} took longer than 45 minutes. Try again.`
  }
  return isChecksumMismatch(error)
    ? `The ${label} download did not match its pinned checksum, so nothing was installed.`
    : message
}

function isChecksumMismatch(error: unknown): boolean {
  return error instanceof Error && /checksum mismatch/.test(error.message)
}
