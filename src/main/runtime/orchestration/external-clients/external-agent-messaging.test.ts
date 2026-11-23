import '../../rpc/dispatch/testing/unused-default-rpc-methods.test-fixture'
import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { OrchestrationDb } from '../db/orchestration-db'
import { OrcaRuntimeService } from '../../orca-runtime'
import { RpcDispatcher } from '../../rpc/dispatcher'
import { EXTERNAL_AGENT_METHODS } from '../../rpc/methods/orchestration/external-agent-methods'
import { ORCHESTRATION_SEND_METHODS } from '../../rpc/methods/orchestration/messaging/send-methods'
import { ORCHESTRATION_CONTRACT_VERSION } from '../../../../shared/orchestration/orchestration-runtime-capabilities'
import type { ExternalAgentCredential } from './external-agent-registry'

it('routes work and replies between external OpenCode, Claude Code and the Orca mailbox, with scoped acknowledgments', async () => {
  const db = new OrchestrationDb(':memory:')
  const runtime = new OrcaRuntimeService()
  runtime.setOrchestrationDb(db)
  const dispatcher = new RpcDispatcher({
    runtime,
    methods: [...EXTERNAL_AGENT_METHODS, ...ORCHESTRATION_SEND_METHODS]
  })
  const call = async <T>(method: string, params: unknown): Promise<T> => {
    const response = await dispatcher.dispatch({
      id: randomUUID(),
      authToken: 'local-test',
      method,
      params,
      orchestrationContractVersion: ORCHESTRATION_CONTRACT_VERSION,
      orchestrationRequestId: randomUUID()
    })
    if (!response.ok) {
      throw new Error(`${response.error.code}: ${response.error.message}`)
    }
    return response.result as T
  }
  try {
    const code = await call<ExternalAgentCredential>('externalAgents.register', {
      agent: 'opencode',
      name: 'External code',
      cwd: '/work/code'
    })
    const review = await call<ExternalAgentCredential>('externalAgents.register', {
      agent: 'claude',
      name: 'External review',
      cwd: '/work/review'
    })
    await call('externalAgents.send', {
      ...code,
      to: review.address,
      subject: 'Review',
      body: 'Review the API changes.'
    })
    const inbox = await call<{ messages: { id: string; body: string; from_handle: string }[] }>(
      'externalAgents.receive',
      { ...review, waitSeconds: 1 }
    )
    expect(inbox.messages.map(({ body, from_handle }) => ({ body, from_handle }))).toEqual([
      { body: 'Review the API changes.', from_handle: code.address }
    ])
    await expect(
      call('externalAgents.ack', { ...code, ids: [inbox.messages[0].id] })
    ).rejects.toThrow('another agent')
    await expect(
      call('externalAgents.receive', {
        ...review,
        token: 'wrong-token-that-is-long-enough-for-validation'
      })
    ).rejects.toThrow('Invalid external agent credential')
    await call('externalAgents.ack', { ...review, ids: [inbox.messages[0].id] })
    expect(
      (await call<{ messages: unknown[] }>('externalAgents.receive', review)).messages
    ).toEqual([])
    await call('externalAgents.send', {
      ...review,
      to: code.address,
      subject: 'Result',
      body: 'Reviewed; add input validation.'
    })
    expect(
      (await call<{ messages: { body: string }[] }>('externalAgents.receive', code)).messages[0]
        .body
    ).toBe('Reviewed; add input validation.')
    await call('orchestration.send', {
      from: 'orca-coordinator',
      to: code.address,
      subject: 'Follow-up',
      body: 'Apply the review.'
    })
    expect(
      (await call<{ messages: { body: string }[] }>('externalAgents.receive', code)).messages.map(
        ({ body }) => body
      )
    ).toContain('Apply the review.')
    const list = await call<{ clients: Record<string, unknown>[] }>(
      'externalAgents.list',
      undefined
    )
    expect(list.clients).toHaveLength(2)
    expect(list.clients.some((entry) => 'token_hash' in entry || 'token' in entry)).toBe(false)
    await call('externalAgents.disconnect', review)
    await expect(
      call('externalAgents.send', {
        ...code,
        to: review.address,
        subject: 'Offline',
        body: 'Must not claim delivery.'
      })
    ).rejects.toThrow('no live pane')
  } finally {
    db.close()
  }
})
