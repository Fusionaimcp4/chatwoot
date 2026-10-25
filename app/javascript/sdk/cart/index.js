import { woocommerceCartAdapter } from './woocommerce';
import { shopifyCartAdapter } from './shopify';

const DEFAULT_PROVIDER = 'woocommerce';

const adapters = {
  woocommerce: woocommerceCartAdapter,
  shopify: shopifyCartAdapter,
};

let lastProvider = null;

/** True when the host page looks like a WooCommerce storefront. */
export const isWooCommerceStorefront = (win = window) => {
  if (typeof win === 'undefined' || !win) return false;

  try {
    if (win.wcSettings || win.wc || win.wc_add_to_cart_params) return true;
    if (win.wc_cart_fragments_params || win.wc_checkout_params) return true;

    const body = win.document?.body;
    if (body?.classList) {
      if (
        body.classList.contains('woocommerce') ||
        body.classList.contains('woocommerce-page') ||
        body.classList.contains('woocommerce-cart') ||
        body.classList.contains('woocommerce-checkout')
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
};

const detectProvider = (win = window) => {
  if (typeof win !== 'undefined' && win?.Shopify) {
    return 'shopify';
  }
  if (isWooCommerceStorefront(win)) {
    return 'woocommerce';
  }
  // Non-store pages: do not assume WooCommerce (avoids /wp-json/.../cart 404 noise).
  return null;
};

export const resolveCartProvider = (provider, win = window) => {
  if (provider) return String(provider).toLowerCase();
  if (lastProvider) return lastProvider;
  return detectProvider(win);
};

const getAdapter = provider => {
  const key = resolveCartProvider(provider);
  if (!key) {
    return null;
  }
  const adapter = adapters[key];
  if (!adapter) {
    throw new Error(`Unsupported cart provider: ${key}`);
  }
  return adapter;
};

/** Parent SDK cart surface. Widget stays provider-blind. */
export const cart = {
  addItem({ provider, ...payload } = {}) {
    const resolved = resolveCartProvider(provider) || DEFAULT_PROVIDER;
    lastProvider = resolved;
    return getAdapter(resolved).addItem(payload);
  },

  async getItemsCount({ provider } = {}) {
    const adapter = getAdapter(provider);
    if (!adapter) {
      return 0;
    }
    return adapter.getItemsCount();
  },

  openCart({ provider } = {}) {
    const resolved = resolveCartProvider(provider) || lastProvider;
    const adapter = getAdapter(resolved);
    if (!adapter) {
      return undefined;
    }
    return adapter.openCart();
  },
};

export { DEFAULT_PROVIDER };

/** @internal Reset between unit tests. */
export const resetCartProviderState = () => {
  lastProvider = null;
};
