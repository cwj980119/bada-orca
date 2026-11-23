import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore, closeTestStores, testState } from '../persistence/persistence-test-harness'
import type { Store } from '../persistence/loading-store/store'
import { RuntimeProjectGroupController } from '../runtime/repositories/runtime-project-group-controller'
import { BotController } from './bot-controller'
import { localBotHomeFilesystem } from './bot-home'
import { defaultIntranetSettings } from '../../shared/intranet/intranet-settings'
import type { RpcContext } from '../runtime/rpc/core'

const osHome = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (original) => ({
  ...(await original<object>()),
  homedir: () => osHome.dir
}))
vi.mock('electron', () => ({ app: { getPath: () => testState.dir } }))
vi.mock('../ssh/config/ssh-config-parser', () => ({
  loadUserSshConfig: () => [],
  sshConfigHostsToTargets: () => []
}))
vi.mock('../telemetry/client', () => ({ track: () => {} }))

describe('company Bot owner RPC', () => {
  let root = ''
  let store: Store
  let bots: BotController
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'orca-bot-owner-rpc-'))
    testState.dir = join(root, 'profile')
    osHome.dir = join(root, 'home')
    mkdirSync(testState.dir)
    mkdirSync(osHome.dir)
    store = createStore()
    const projects = new RuntimeProjectGroupController({
      getStore: () => store,
      resolveRepo: vi.fn(),
      notifyReposChanged: () => {},
      resolveFolderConnectionId: () => null,
      teardownFolderWorkspacePtys: async () => {},
      acquireFileWatcherRemoval: async () => ({ finish: async () => {} }),
      cleanupRemovedFolderWorkspaceState: () => {},
      emitWorktreeLifecycle: () => {}
    })
    bots = new BotController({
      getStore: () => store,
      notifyBotsWritten: () => {},
      createFolderWorkspace: async (input) =>
        (await projects.createFolderWorkspace(input)).folderWorkspace,
      deleteFolderWorkspace: async (id) => ({ deleted: store.removeFolderWorkspace(id) }),
      deleteBotAutomations: async () => {},
      botsRoot: () => join(root, 'bots'),
      filesystem: localBotHomeFilesystem
    })
  })
  afterEach(async () => {
    await closeTestStores()
    rmSync(root, { recursive: true, force: true })
  })
  it('creates a company-model bot through the owner RPC and refuses an agent creating another bot', async () => {
    const { BOT_CREATE_METHOD } = await import('../runtime/rpc/methods/bots-create')
    store.updateSettings({
      botsEnabled: true,
      intranet: {
        ...defaultIntranetSettings(),
        opencode: {
          baseUrl: 'http://127.0.0.1:9/v1',
          model: 'coder',
          models: [
            { id: 'coder', name: '', purpose: '' },
            { id: 'review', name: '', purpose: '' }
          ],
          apiKeyEnv: '',
          configVersion: 'v1'
        }
      }
    })
    const context = {
      runtime: { bots, requireStore: () => store },
      caller: { kind: 'desktop' }
    } as unknown as RpcContext
    const made = await BOT_CREATE_METHOD.handler(
      {
        name: 'Company reviewer',
        agent: 'opencode',
        launch: { model: 'internal/review' },
        takingOver: true
      },
      context
    )
    expect(made.bot.launch?.model).toBe('internal/review')
    expect(store.getBots().map((bot) => bot.name)).toEqual(['Company reviewer'])
    await expect(
      BOT_CREATE_METHOD.handler(
        { name: 'Unapproved bot', agent: 'opencode', takingOver: true },
        { ...context, caller: { kind: 'local-cli' } }
      )
    ).rejects.toThrow()
    expect(store.getBots().map((bot) => bot.name)).toEqual(['Company reviewer'])
  })
})
