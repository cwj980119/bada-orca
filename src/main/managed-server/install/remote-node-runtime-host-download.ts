import { copyFile, link, mkdtemp } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { NodeRuntimeTarget } from '../../../shared/node-runtime/node-runtime-pin'
import type { RemoteHostPlatform } from '../../ssh/remote-host/ssh-remote-platform'
export async function stageNodeRuntimeArchive(args: {
  host: RemoteHostPlatform
  target: NodeRuntimeTarget
  stageDir: string
  archivePath: () => Promise<string>
  offlineArchivePath?: string

  hostConnectTimeoutSeconds?: number
  exec: (
    command: string,
    options: {
      signal?: AbortSignal
      timeoutMs?: number
    }
  ) => Promise<string>
  upload: (localDir: string) => Promise<void>
  /** Expose the local stage immediately for caller cleanup. */
  onLocalStage: (localDir: string) => void
  signal?: AbortSignal
}): Promise<{
  archive: string
}> {
  args.signal?.throwIfAborted()
  const archivePath = await args.archivePath()
  const uploadDir = await mkdtemp(join(dirname(archivePath), '.runtime-upload-'))
  args.onLocalStage(uploadDir)
  const archive = basename(archivePath)
  await link(archivePath, join(uploadDir, archive)).catch(() =>
    copyFile(archivePath, join(uploadDir, archive))
  )
  args.signal?.throwIfAborted()
  await args.upload(uploadDir)
  return { archive }
}
