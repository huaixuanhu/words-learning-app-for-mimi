export async function waitForStableQueue(
  readQueue: () => Promise<void>,
) {
  while (true) {
    const pending = readQueue();

    await pending;

    if (readQueue() === pending) {
      return;
    }
  }
}
