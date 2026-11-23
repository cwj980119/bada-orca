// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useBotAgentSetup } from './use-bot-agent-setup'
import type { BotAgent } from '../../../../shared/bot-types'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'

afterEach(cleanup)

it('waits for detection and selects the installed CLI instead of an absent preferred agent', () => {
  const view = renderHook(
    ({ choices }: { choices: BotAgent[] }) => useBotAgentSetup(choices, 'local', 'claude'),
    { initialProps: { choices: [] as BotAgent[] } }
  )
  expect(view.result.current.setup).toBeNull()
  view.rerender({ choices: ['codex'] })
  expect(view.result.current.setup).toEqual({ agent: 'codex' })
  view.rerender({ choices: [] })
  expect(view.result.current.setup).toBeNull()
})

it('keeps a model choice on its host and clears it when switching to a different host', () => {
  const view = renderHook(
    ({ hostId, choices }: { hostId: ExecutionHostId; choices: BotAgent[] }) =>
      useBotAgentSetup(choices, hostId),
    {
      initialProps: {
        hostId: 'local' as ExecutionHostId,
        choices: ['codex', 'opencode'] as BotAgent[]
      }
    }
  )
  act(() => view.result.current.setSetup({ agent: 'opencode', launch: { model: 'company/coder' } }))
  view.rerender({ hostId: 'local', choices: ['codex', 'opencode'] })
  expect(view.result.current.setup).toEqual({
    agent: 'opencode',
    launch: { model: 'company/coder' }
  })
  view.rerender({ hostId: 'ssh:server', choices: ['codex'] })
  expect(view.result.current.setup).toEqual({ agent: 'codex' })
})
