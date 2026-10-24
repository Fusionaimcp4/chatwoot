/**
 * Await a promise but resolve after `ms` even if it is still pending.
 * Errors from the promise are swallowed so callers are never blocked.
 * @param {Promise<*>} promise
 * @param {number} ms
 * @returns {Promise<*>}
 */
export const awaitWithTimeout = (promise, ms = 2000) => {
  if (!promise || typeof promise.then !== 'function') {
    return Promise.resolve();
  }

  return Promise.race([
    promise.catch(() => undefined),
    new Promise(resolve => {
      setTimeout(resolve, ms);
    }),
  ]);
};
