import { useAppStore } from '../../../store/index'

export function registerUpdaterStatusIpcBridge(_unsubs: (() => void)[]): void {
  useAppStore.getState().setUpdateStatus({ state: 'idle' })
}
