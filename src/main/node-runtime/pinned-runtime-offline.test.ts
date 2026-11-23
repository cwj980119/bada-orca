import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { materializeVerifiedRuntimeArchive } from './pinned-runtime-materializer'
import { stageNodeRuntimeArchive } from '../managed-server/install/remote-node-runtime-host-download'
import { getRemoteHostPlatform } from '../ssh/remote-host/ssh-remote-platform'

const archive = {
  label: 'Node',
  archiveFile: 'runtime.tar.gz',
  url: '',
  archiveSha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
}

it('uses a hash-verified archive staged offline without a download address', async () => {
  const cache = await mkdtemp(join(tmpdir(), 'orca-offline-archive-'))
  try {
    const file = join(cache, 'runtime.tar.gz')
    await writeFile(file, 'abc')
    const resolved = await materializeVerifiedRuntimeArchive(archive, cache, {
      fetcher: async () => {
        throw new Error('An offline archive must not issue a request')
      }
    })
    expect(resolved).toBe(file)
  } finally {
    await rm(cache, { recursive: true, force: true })
  }
})

it('reports where to stage a missing archive instead of trying a public download', async () => {
  const cache = await mkdtemp(join(tmpdir(), 'orca-offline-missing-'))
  try {
    await expect(
      materializeVerifiedRuntimeArchive(archive, cache, {
        fetcher: async () => {
          throw new Error('Missing mirror must not issue a request')
        }
      })
    ).rejects.toThrow(`Stage the pinned Node archive at ${join(cache, 'runtime.tar.gz')}`)
  } finally {
    await rm(cache, { recursive: true, force: true })
  }
})

it('propagates archive preparation failure without a remote download fallback', async () => {
  const unavailable = new Error('Internal mirror is unavailable')
  await expect(
    stageNodeRuntimeArchive({
      host: getRemoteHostPlatform('linux-x64'),
      target: 'linux-x64-glibc',
      stageDir: '/tmp/orca-runtime',
      archivePath: async () => {
        throw unavailable
      },
      exec: async () => {
        throw new Error('The SSH host must not download an archive')
      },
      upload: async () => {
        throw new Error('There is no archive to upload')
      },
      onLocalStage: () => {}
    })
  ).rejects.toBe(unavailable)
})
