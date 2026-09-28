import { woocommerceCartAdapter } from './woocommerce';

const DEFAULT_PROVIDER = 'woocommerce';

const adapters = {
  woocommerce: woocommerceCartAdapter,
};

const getAdapter = (provider = DEFAULT_PROVIDER) => {
  const key = String(provider || DEFAULT_PROVIDER).toLowerCase();
  const adapter = adapters[key];
  if (!adapter) {
    throw new Error(`Unsupported cart provider: ${key}`);
  }
  return adapter;
};

/** Parent SDK cart surface. Widget stays provider-blind. */
export const cart = {
  addItem({ provider, ...payload } = {}) {
    return getAdapter(provider).addItem(payload);
  },

  getItemsCount({ provider } = {}) {
    return getAdapter(provider).getItemsCount();
  },

  openCart({ provider } = {}) {
    return getAdapter(provider).openCart();
  },
};

export { DEFAULT_PROVIDER };
