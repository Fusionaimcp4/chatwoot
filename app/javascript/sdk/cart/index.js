import { woocommerceCartAdapter } from './woocommerce';
import { shopifyCartAdapter } from './shopify';

const DEFAULT_PROVIDER = 'woocommerce';

const adapters = {
  woocommerce: woocommerceCartAdapter,
  shopify: shopifyCartAdapter,
};

let lastProvider = null;

const detectProvider = () => {
  if (typeof window !== 'undefined' && window.Shopify) {
    return 'shopify';
  }
  return DEFAULT_PROVIDER;
};

export const resolveCartProvider = provider => {
  if (provider) return String(provider).toLowerCase();
  if (lastProvider) return lastProvider;
  return detectProvider();
};

const getAdapter = provider => {
  const key = resolveCartProvider(provider);
  const adapter = adapters[key];
  if (!adapter) {
    throw new Error(`Unsupported cart provider: ${key}`);
  }
  return adapter;
};

/** Parent SDK cart surface. Widget stays provider-blind. */
export const cart = {
  addItem({ provider, ...payload } = {}) {
    const resolved = resolveCartProvider(provider);
    lastProvider = resolved;
    return getAdapter(resolved).addItem(payload);
  },

  getItemsCount({ provider } = {}) {
    return getAdapter(provider).getItemsCount();
  },

  openCart({ provider } = {}) {
    return getAdapter(provider).openCart();
  },
};

export { DEFAULT_PROVIDER };
