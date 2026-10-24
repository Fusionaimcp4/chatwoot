import { awaitWithTimeout } from '../awaitWithTimeout';

describe('#awaitWithTimeout', () => {
  it('resolves with the promise value when it finishes in time', async () => {
    const result = await awaitWithTimeout(Promise.resolve('ok'), 100);
    expect(result).toEqual('ok');
  });

  it('resolves when the timeout wins', async () => {
    vi.useFakeTimers();
    const slow = new Promise(resolve => {
      setTimeout(() => resolve('late'), 5000);
    });
    const pending = awaitWithTimeout(slow, 50);
    vi.advanceTimersByTime(50);
    await expect(pending).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('swallows promise rejection so callers are not blocked', async () => {
    await expect(
      awaitWithTimeout(Promise.reject(new Error('fail')), 100)
    ).resolves.toBeUndefined();
  });
});
