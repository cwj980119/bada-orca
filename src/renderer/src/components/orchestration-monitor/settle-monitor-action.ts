export async function settleMonitorAction(
  action: () => Promise<void>,
  settled: () => void
): Promise<void> {
  try {
    await action()
  } finally {
    settled()
  }
}
