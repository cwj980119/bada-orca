import { expect, it } from 'vitest'
import { createRestTestRig } from './structured-agent-session-rest-test-rig.test-fixture'
import {
  createTestParams,
  CREATE_TEST_CALLER
} from './structured-agent-session-create.test-fixture'
import { HOST_TEST_SESSION } from './structured-agent-session-host-test-data.test-fixture'
import { setStructuredAgentSessionHost } from '../structured-agent-session-registry'
import { readMonitorSessionExecution } from '../../../../runtime/orchestration/monitor/monitor-session-execution'
import { createStructuredMailboxPointerHost } from '../../../../runtime/orchestration/mailbox/structured-pointer/structured-mailbox-pointer-host'

it('wakes a resting conversation and waits for CLI readiness before completing preparation', async () => {
  const rig = await createRestTestRig({ idleSweep: { intervalMs: 3_600_000 } })
  const opening = Promise.withResolvers<void>()
  const allowOpen = Promise.withResolvers<void>()
  setStructuredAgentSessionHost(rig.host)
  try {
    await expect(rig.host.create(CREATE_TEST_CALLER, createTestParams())).resolves.toMatchObject({
      ok: true
    })
    expect(rig.host.hasLoadedProviders()).toBe(false)
    expect((await readMonitorSessionExecution(HOST_TEST_SESSION)).execution.state).toBe('sleeping')
    expect(rig.host.hasLoadedProviders()).toBe(false)
    rig.host.deps.adapter.open = async () => {
      opening.resolve()
      await allowOpen.promise
      return { reportedOptions: { model: '' } }
    }
    let prepared = false
    const wake = createStructuredMailboxPointerHost().prepare!(HOST_TEST_SESSION).then((result) => {
      prepared = true
      return result
    })
    await opening.promise
    expect(prepared).toBe(false)
    expect((await readMonitorSessionExecution(HOST_TEST_SESSION)).execution.state).toBe('starting')
    allowOpen.resolve()
    await expect(wake).resolves.toBe(true)
    expect(rig.host.hasLoadedProviders()).toBe(true)
    expect((await readMonitorSessionExecution(HOST_TEST_SESSION)).execution.state).toBe('idle')
    expect(await (await rig.host.journalReads(HOST_TEST_SESSION)).pendingSubmissions()).toEqual([])
  } finally {
    setStructuredAgentSessionHost(null)
    allowOpen.resolve()
    await rig.dispose()
  }
})
