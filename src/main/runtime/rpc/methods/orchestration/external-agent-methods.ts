import {
  ExternalAgentCredentialParams,
  ExternalAgentRegisterParams,
  ExternalAgentReceiveParams,
  ExternalAgentAckParams,
  ExternalAgentSendParams
} from '../../../../../shared/rpc-contract/orchestration/external-agent-params'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { getAppEnvironment } from '../../../../../shared/app-lifecycle/app-environment'
import { getProfileUserDataPath } from '../../../../orca-profiles/profile-storage-paths'
import { getBundledLauncherPath } from '../../../../cli/packaged-assets/bundled-cli-launcher-path'
import { defineMethod } from '../../core'
import { externalAgents } from '../../../orchestration/external-clients/external-agent-registry'
import { RpcDispatcher } from '../../dispatcher'
import { ORCHESTRATION_SEND_METHODS } from './messaging/send-methods'
import { ORCHESTRATION_CONTRACT_VERSION } from '../../../../../shared/orchestration/orchestration-runtime-capabilities'

export const EXTERNAL_AGENT_METHODS = [
  defineMethod({
    name: 'externalAgents.setup',
    permission: 'workspace',
    params: null,
    handler: () => {
      const app = getAppEnvironment()
      const launcher =
        app.getCliLauncherPath?.() ??
        (app.isPackaged() ? getBundledLauncherPath(process.platform, process.resourcesPath) : null)
      return {
        command: launcher ?? process.execPath,
        args: launcher
          ? ['external-agent-mcp']
          : [join(app.getAppPath(), 'out', 'cli', 'index.js'), 'external-agent-mcp'],
        env: {
          ORCA_USER_DATA_PATH: getProfileUserDataPath(),
          ...(launcher ? {} : { ELECTRON_RUN_AS_NODE: '1' })
        }
      }
    }
  }),
  defineMethod({
    name: 'externalAgents.register',
    permission: 'workspace',
    params: ExternalAgentRegisterParams,
    handler: (params, { runtime }) => externalAgents(runtime).register(params)
  }),
  defineMethod({
    name: 'externalAgents.list',
    permission: 'workspace',
    params: null,
    handler: (_params, { runtime }) => ({ clients: externalAgents(runtime).list() })
  }),
  defineMethod({
    name: 'externalAgents.heartbeat',
    permission: 'workspace',
    params: ExternalAgentCredentialParams,
    handler: (params, { runtime }) => externalAgents(runtime).authenticate(params)
  }),
  defineMethod({
    name: 'externalAgents.disconnect',
    permission: 'workspace',
    params: ExternalAgentCredentialParams,
    handler: (params, { runtime }) => {
      externalAgents(runtime).disconnect(params)
      return { disconnected: true }
    }
  }),
  defineMethod({
    name: 'externalAgents.receive',
    permission: 'workspace',
    params: ExternalAgentReceiveParams,
    handler: async (params, { runtime, signal }) => {
      externalAgents(runtime).authenticate(params)
      const db = runtime.getOrchestrationDb()
      const controller = new AbortController()
      const waiting = params.waitSeconds
        ? runtime.waitForMessage(params.address, {
            timeoutMs: params.waitSeconds * 1000,
            signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
          })
        : null
      try {
        let messages = db.getUnreadMessages(params.address)
        if (!messages.length && waiting) {
          await waiting
          messages = db.getUnreadMessages(params.address)
        }
        return { messages: messages.slice(0, 50) }
      } finally {
        controller.abort()
        await waiting?.catch(() => {})
      }
    }
  }),
  defineMethod({
    name: 'externalAgents.ack',
    permission: 'workspace',
    params: ExternalAgentAckParams,
    handler: (params, { runtime }) => {
      externalAgents(runtime).authenticate(params)
      const db = runtime.getOrchestrationDb()
      if (params.ids.some((id) => db.getMessageById(id)?.to_handle !== params.address)) {
        throw new Error('Cannot acknowledge another agent’s messages.')
      }
      db.markAsRead(params.ids)
      return { acknowledged: params.ids.length }
    }
  }),
  defineMethod({
    name: 'externalAgents.send',
    permission: 'workspace',
    params: ExternalAgentSendParams,
    handler: async (params, { runtime }) => {
      externalAgents(runtime).authenticate(params)
      const dispatcher = new RpcDispatcher({ runtime, methods: ORCHESTRATION_SEND_METHODS })
      const response = await dispatcher.dispatch({
        id: randomUUID(),
        authToken: '',
        method: 'orchestration.send',
        params: {
          from: params.address,
          to: params.to,
          subject: params.subject,
          body: params.body,
          type: 'status'
        },
        orchestrationContractVersion: ORCHESTRATION_CONTRACT_VERSION,
        orchestrationRequestId: randomUUID()
      })
      if (!response.ok) {
        throw new Error(response.error.message)
      }
      return response.result
    }
  })
]
