import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cart,
  isWooCommerceStorefront,
  resolveCartProvider,
  resetCartProviderState,
} from '../index';

vi.mock('../woocommerce', () => ({
  woocommerceCartAdapter: {
    getItemsCount: vi.fn(async () => 3),
    addItem: vi.fn(async () => ({ itemsCount: 1 })),
    openCart: vi.fn(),
  },
}));

vi.mock('../shopify', () => ({
  shopifyCartAdapter: {
    getItemsCount: vi.fn(async () => 2),
    addItem: vi.fn(async () => ({ itemsCount: 1 })),
    openCart: vi.fn(),
  },
}));

describe('cart provider detection', () => {
  beforeEach(() => {
    resetCartProviderState();
    vi.clearAllMocks();
  });

  it('detects Shopify when window.Shopify exists', () => {
    expect(resolveCartProvider(undefined, { Shopify: { shop: 'x' } })).toEqual(
      'shopify'
    );
  });

  it('detects WooCommerce from storefront markers', () => {
    expect(isWooCommerceStorefront({ wcSettings: {} })).toEqual(true);
    expect(
      resolveCartProvider(undefined, {
        wcSettings: {},
        document: { body: { classList: { contains: () => false } } },
      })
    ).toEqual('woocommerce');
  });

  it('returns null on non-store pages (no default WooCommerce)', () => {
    expect(
      resolveCartProvider(undefined, {
        document: { body: { classList: { contains: () => false } } },
      })
    ).toEqual(null);
  });

  it('getItemsCount returns 0 without probing when no provider is detected', async () => {
    const { woocommerceCartAdapter } = await import('../woocommerce');
    // Simulate non-store window for detectProvider via explicit null path:
    // getItemsCount with no provider and no lastProvider uses detectProvider(window).
    // In jsdom there is typically no Woo/Shopify marker.
    const count = await cart.getItemsCount();
    expect(count).toEqual(0);
    expect(woocommerceCartAdapter.getItemsCount).not.toHaveBeenCalled();
  });

  it('getItemsCount uses an explicit provider', async () => {
    const { woocommerceCartAdapter } = await import('../woocommerce');
    const count = await cart.getItemsCount({ provider: 'woocommerce' });
    expect(count).toEqual(3);
    expect(woocommerceCartAdapter.getItemsCount).toHaveBeenCalled();
  });

  it('addItem still defaults to WooCommerce when cards pass no provider', async () => {
    const { woocommerceCartAdapter } = await import('../woocommerce');
    await cart.addItem({ productId: 1 });
    expect(woocommerceCartAdapter.addItem).toHaveBeenCalled();
  });
});
