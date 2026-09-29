import { describe, it, expect } from 'vitest';
import { resolveShopifyVariantId } from '../shopify';

describe('resolveShopifyVariantId', () => {
  it('prefers variantId when present', () => {
    expect(
      resolveShopifyVariantId({
        productId: 'gid://shopify/Product/1',
        variantId: 'gid://shopify/ProductVariant/998877',
      })
    ).toBe(998877);
  });

  it('accepts numeric variant ids', () => {
    expect(resolveShopifyVariantId({ variantId: 4242 })).toBe(4242);
    expect(resolveShopifyVariantId({ variantId: '4242' })).toBe(4242);
  });

  it('returns null for product GIDs and empty payloads', () => {
    expect(
      resolveShopifyVariantId({ productId: 'gid://shopify/Product/1' })
    ).toBeNull();
    expect(resolveShopifyVariantId({})).toBeNull();
  });
});
