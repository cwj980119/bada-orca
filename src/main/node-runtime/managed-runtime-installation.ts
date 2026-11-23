// Serialize release changes per runtime; rename commits installation, so later cancellation cannot undo it.
// Removal runs only inside the host ownership fence, never beside installation.
// Serialize release changes per runtime; rename commits installation, so later cancellation cannot undo it.
// Removal runs only inside the host ownership fence, never beside installation.
import { randomUUID } from 'node:crypto'

import { rm } from 'node:fs/promises'
import type {
  ManagedRuntimeInstallState,
  ManagedRuntimeOperation
} from '../../shared/agent-launch/installation/managed-runtime-install'
import type { MainHttpClient } from '../network/http-client'
import { RevisionedState } from '../runtime/events/revisioned-state'
import {
  reclaimRuntimeReleases,
  resolveInstalledRuntimeRelease,
  type ManagedRuntime
} from './managed-runtime-release'

export type ManagedRuntimeInstallationDeps = {
  dataDirectory: string
  findExternal: () => Promise<boolean>
  /** Told the release launches resolve to each time this reads the disk; null when none is whole. */
  onRelease?: (folder: string | null) => void
  /** Reject unless no host workload uses this runtime. */
  fence: (work: () => Promise<void>) => Promise<void>
  fetcher?: MainHttpClient['fetch']
}
type Run = {
  id: string
  controller: AbortController
  committed: boolean
}
const releaseChangeListeners = new Set<() => void>()
export function onManagedRuntimeReleasesChanged(listener: () => void): () => void {
  releaseChangeListeners.add(listener)
  return () => releaseChangeListeners.delete(listener)
}
type InstalledFacts = Omit<ManagedRuntimeInstallState, 'agent' | 'revision' | 'operation'>
export class ManagedRuntimeInstallation {
  private readonly state = new RevisionedState<ManagedRuntimeOperation | null>(null)
  private readonly root: string
  private running: Run | null = null
  private mutation: Promise<void>
  private facts: {
    phase: string
    read: Promise<InstalledFacts>
  } | null = null
  constructor(
    private readonly agent: string,
    private readonly runtime: ManagedRuntime,
    private readonly deps: ManagedRuntimeInstallationDeps
  ) {
    this.root = runtime.root(deps.dataDirectory)
    this.mutation = this.reclaim()
  }
  /** Reread disk/PATH on fresh reads or phase changes, never byte-progress updates. */
  async status(fresh = true): Promise<ManagedRuntimeInstallState> {
    const { value: operation, revision } = this.state.get()
    const phase = `${operation?.id}:${operation?.phase}`
    let facts = this.facts
    if (fresh || facts?.phase !== phase) {
      const read = this.readInstalledFacts()
      facts = { phase, read }
      this.facts = facts
      read.catch(() => {
        this.facts = this.facts?.read === read ? null : this.facts
      })
    }
    return { agent: this.agent, revision, ...(await facts.read), operation }
  }
  subscribe(onChange: () => void): () => void {
    return this.state.subscribe(onChange)
  }
  private async readInstalledFacts(): Promise<InstalledFacts> {
    const pin = this.runtime.pin()
    const { release, broken, unreadable } = resolveInstalledRuntimeRelease(this.root, pin)
    if (!unreadable) {
      this.deps.onRelease?.(release?.folder ?? null)
    }
    // Unreadable is not absent; preserve clients’ last known installation state.
    if (unreadable && !release?.current) {
      throw new Error(`Couldn't read the installed ${this.runtime.label} files on this host.`)
    }
    const source = (await this.deps.findExternal()) ? 'external' : release ? 'managed' : null
    return {
      available: false,
      version: pin?.version ?? null,
      ...(pin && { downloadBytes: pin.archiveBytes }),
      installedVersion: release?.version ?? null,
      installedCurrent: release?.current ?? false,
      ...(pin && !release?.current && broken.includes(pin.version) && { damaged: true }),
      canRemove: release !== null || broken.length > 0,
      source,
      ...(this.runtime.refreshPin && { updatesAutomatically: true as const })
    }
  }
  /** Bring Orca's own copy to the latest release; never installs one nobody asked for or touches a user's own. */
  async updateIfBehind(): Promise<void> {}
  /** Join installs; canceled work must finish cleanup before another begins. */
  install(): ManagedRuntimeOperation {
    {
      throw new Error('Install the approved CLI offline before starting a session.')
    }
  }
  remove(): ManagedRuntimeOperation {
    const current = this.state.get().value
    if (this.running && current?.kind === 'remove') {
      return current
    }
    if (this.running) {
      throw new Error(`${this.runtime.label} is installing. Try again after it finishes.`)
    }
    const run: Run = { id: randomUUID(), controller: new AbortController(), committed: false }
    const operation: ManagedRuntimeOperation = {
      id: run.id,
      kind: 'remove',
      phase: 'removing',
      downloadedBytes: 0,
      totalBytes: null
    }
    this.running = run
    this.state.set(operation)
    this.mutation = this.mutation.then(() => this.runRemove(run))
    return operation
  }
  /** Await unwinding; already-committed installs succeed despite cancellation. */
  async cancel(operationId: string): Promise<ManagedRuntimeOperation | null> {
    const current = this.state.get().value
    if (current?.id !== operationId) {
      throw new Error(`That ${this.runtime.label} installation is no longer running.`)
    }
    if (current.kind === 'remove') {
      throw new Error(`Removing ${this.runtime.label} cannot be cancelled.`)
    }
    const run = this.running
    if (run?.id === operationId && !run.committed) {
      run.controller.abort()
    }
    await this.mutation
    return this.state.get().value
  }
  private publish(run: Run, patch: Partial<ManagedRuntimeOperation>): void {
    const operation = this.state.get().value
    // Once aborted, unwinding progress is stale; only final outcomes may advance state.
    const settles =
      patch.phase === 'succeeded' || patch.phase === 'cancelled' || patch.phase === 'failed'
    if (operation?.id === run.id && (settles || !run.controller.signal.aborted)) {
      this.state.set({ ...operation, ...patch })
      if (settles) {
        // Reread the disk now so onRelease learns the outcome even when no client is watching.
        void this.status(false).catch(() => {})
        releaseChangeListeners.forEach((listener) => listener())
      }
    }
  }
  private async runRemove(run: Run): Promise<void> {
    try {
      await this.deps.fence(() => rm(this.root, { recursive: true, force: true }))
      this.publish(run, { phase: 'succeeded' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.publish(run, { phase: 'failed', error: message })
    } finally {
      this.running = this.running === run ? null : this.running
    }
  }
  private async reclaim(): Promise<void> {
    const { release, unreadable } = resolveInstalledRuntimeRelease(this.root, this.runtime.pin())
    if (!unreadable) {
      this.deps.onRelease?.(release?.folder ?? null)
    }
    if (unreadable) {
      // Unknown active release means no release is provably stale.
      console.warn(`[managed-runtime] ${this.agent} releases unreadable; not reclaiming this run`)
      return
    }
    await this.reclaimOlderThan(release?.version ?? null, null)
  }
  /** Keep the release launches resolve to and the one running chats may still use. */
  private async reclaimOlderThan(current: string | null, previous: string | null): Promise<void> {
    const keep = [current, previous].filter((version) => version !== null)
    const failed = await reclaimRuntimeReleases(this.root, keep).catch((error: unknown) => [
      String(error)
    ])
    if (failed.length > 0) {
      console.warn(`[managed-runtime] old ${this.agent} releases not removed:`, failed)
    }
  }
}
