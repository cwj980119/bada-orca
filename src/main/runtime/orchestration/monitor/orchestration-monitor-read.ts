import type {
  MonitorAssignment,
  MonitorMessage,
  MonitorParticipant,
  MonitorTask,
  OrchestrationMonitorSnapshot
} from '../../../../shared/orchestration/orchestration-monitor'
import type { OrcaRuntimeService } from '../../orca-runtime'
import type { MessageRow } from '../db/orchestration-records'
import { agentMessageSender } from '../mailbox/senders/agent-message-sender'
import { externalAgents } from '../external-clients/external-agent-registry'
import { botOfSession } from '../../../bots/bot-session-tabs'
import {
  formatOrcaSessionAddress,
  isOrcaSessionId
} from '../../../../shared/agent-session/identity/orca-session-address'
import { parseMessageTaskId } from '../../rpc/methods/orchestration/messaging/message-payload'
import { readWorkerTerminalHostScope } from '../../../../shared/orchestration/workers/worker-terminal-host-scope'
import { toSshExecutionHostId } from '../../../../shared/execution-host/execution-host'

const LIMIT = 200

export function createMonitorRead(runtime: OrcaRuntimeService) {
  const db = runtime.getOrchestrationDb()
  const bots = runtime.bots.list()
  const participants = new Map<string, MonitorParticipant>()
  const aliases = new Map<string, string>()
  const snapshotSender = runtime.orchestrationSenderNames.snapshotReader()
  const clients = externalAgents(runtime)
  const add = (participant: MonitorParticipant) => {
    participants.set(participant.id, participant)
    aliases.set(participant.address, participant.id)
    return participant.id
  }
  for (const bot of bots.slice(0, LIMIT)) {
    const id = `bot:${bot.id}`
    add({
      id,
      address: id,
      name: bot.name,
      kind: 'bot',
      agent: bot.agent,
      model: bot.launch?.model ?? null,
      executionHost: null,
      state: bot.paused ? 'paused' : 'registered',
      cwd: null
    })
    aliases.set(`bot:${bot.name}`, id)
    if (bot.chatSessionId && isOrcaSessionId(bot.chatSessionId)) {
      aliases.set(formatOrcaSessionAddress(bot.chatSessionId), id)
    }
  }
  const resolve = (address: string, sentAt?: string): string => {
    const known = address.startsWith('run:') ? undefined : aliases.get(address)
    if (known) {
      return known
    }
    const sender = agentMessageSender(address, db, snapshotSender, undefined, sentAt)
    const session = sender.party.orcaSessionId
    const bot = session ? botOfSession(runtime.bots, session) : null
    const dispatch = address.startsWith('dispatch:')
      ? db.getDispatchContextById(address.slice(9))
      : undefined
    const placement = dispatch ? db.getFederatedDispatch(dispatch.id) : undefined
    const hostScope = readWorkerTerminalHostScope(dispatch?.host_scope)
    const executionHost =
      placement?.environment_name ??
      (hostScope.kind === 'remote' && hostScope.targetId
        ? toSshExecutionHostId(hostScope.targetId)
        : null)
    let id = bot ? `bot:${bot.id}` : session ? formatOrcaSessionAddress(session) : address
    if (address.startsWith('dispatch:') && !session) {
      if (
        dispatch?.assignee_handle &&
        dispatch.process_incarnation &&
        dispatch.process_incarnation ===
          runtime.getTerminalProcessIncarnation(dispatch.assignee_handle)
      ) {
        id = aliases.get(dispatch.assignee_handle) ?? dispatch.assignee_handle
      }
    }
    const external = address.startsWith('external:') ? clients.find(address) : null
    if (!participants.has(id)) {
      add({
        id,
        address,
        name: bot?.name ?? external?.name ?? sender.name ?? address,
        kind: bot
          ? 'bot'
          : session
            ? 'session'
            : address.startsWith('external:')
              ? 'external'
              : address.startsWith('dispatch:')
                ? 'worker'
                : address.startsWith('term_')
                  ? 'terminal'
                  : 'unknown',
        agent: external?.agent ?? sender.agent ?? null,
        model: null,
        executionHost: executionHost ?? sender.host ?? null,
        state: external ? (clients.connected(address) ? 'connected' : 'offline') : 'unknown',
        cwd: external?.cwd ?? null
      })
    }
    // A Run can change coordinator; message-time resolution must not become a permanent alias.
    if (!address.startsWith('run:')) {
      aliases.set(address, id)
    }
    return id
  }
  const task = (taskId: string | undefined, dispatchId?: string): MonitorTask | null => {
    const dispatch = dispatchId ? db.getDispatchContextById(dispatchId) : undefined
    const row = taskId || dispatch ? db.getTask(taskId ?? dispatch!.task_id) : undefined
    return row
      ? {
          id: row.id,
          title: row.task_title ?? row.display_name ?? row.spec.slice(0, 160),
          status: row.status,
          dispatchStatus: dispatch?.status ?? null
        }
      : null
  }
  const message = (row: MessageRow): MonitorMessage => {
    const dispatchAddress = [row.from_handle, row.to_handle].find((address) =>
      address.startsWith('dispatch:')
    )
    const question = db.getQuestion(row.id)
    return {
      id: row.id,
      from: resolve(row.from_handle, row.created_at),
      to: resolve(row.to_handle, row.created_at),
      fromAddress: row.from_handle,
      toAddress: row.to_handle,
      subject: row.subject,
      preview: row.body.slice(0, 300),
      type: row.type,
      priority: row.priority,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
      delivery:
        row.delivery_contract === 'audit_only'
          ? 'audit'
          : row.read
            ? 'read'
            : row.delivered_at
              ? 'delivered'
              : 'pending',
      question: question?.status ?? null,
      outcome: db.getBotRequestOutcome(row.id),
      threadId: row.thread_id,
      runId: row.run_id,
      task: task(parseMessageTaskId(row.payload ?? undefined), dispatchAddress?.slice(9))
    }
  }
  return { db, bots, participants, aliases, clients, add, resolve, task, message }
}

export async function readOrchestrationMonitor(
  runtime: OrcaRuntimeService
): Promise<OrchestrationMonitorSnapshot> {
  const read = createMonitorRead(runtime)
  const terminals = await runtime.listTerminals(undefined, LIMIT, { includeVisualLayouts: false })
  for (const terminal of terminals.terminals) {
    read.add({
      id: terminal.handle,
      address: terminal.handle,
      name: terminal.paneTitle ?? terminal.title ?? terminal.handle,
      kind: 'terminal',
      agent: terminal.agentIdentity ?? null,
      model: null,
      executionHost: terminal.executionHostId ?? null,
      state:
        terminal.verdict === 'live'
          ? 'connected'
          : terminal.verdict === 'exited'
            ? 'offline'
            : 'unknown',
      cwd: terminal.worktreePath
    })
  }
  for (const client of read.clients.list(LIMIT)) {
    read.add({
      id: client.address,
      address: client.address,
      name: client.name,
      kind: 'external',
      agent: client.agent,
      model: null,
      executionHost: null,
      state: 'connected',
      cwd: client.cwd
    })
  }
  const rows = read.db.getInbox(LIMIT + 1)
  const messages = rows.slice(0, LIMIT).map(read.message)
  const dispatches = read.db.db
    .prepare('SELECT id FROM dispatch_contexts ORDER BY rowid DESC LIMIT ?')
    .all(LIMIT + 1) as { id: string }[]
  const assignments: MonitorAssignment[] = []
  for (const { id } of dispatches.slice(0, LIMIT)) {
    const dispatch = read.db.getDispatchContextById(id)!
    const from = dispatch.creator_dispatch_id
      ? `dispatch:${dispatch.creator_dispatch_id}`
      : dispatch.creator_orca_session_id
        ? formatOrcaSessionAddress(dispatch.creator_orca_session_id)
        : (dispatch.creator_handle ?? `run:${dispatch.run_id}`)
    const task = read.task(dispatch.task_id, id)
    if (task) {
      assignments.push({ id, from: read.resolve(from), to: read.resolve(`dispatch:${id}`), task })
    }
  }
  return {
    capturedAt: new Date().toISOString(),
    participants: [...read.participants.values()],
    messages,
    assignments,
    limits: {
      messages: rows.length > LIMIT,
      assignments: dispatches.length > LIMIT,
      participants: terminals.truncated || read.bots.length > LIMIT
    },
    omittedTerminalHosts: terminals.hostScope?.omittedHostIds ?? []
  }
}
