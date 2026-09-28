import { describe, it, expect } from 'vitest';
import { resolveLineItemId } from '../woocommerce';

describe('resolveLineItemId', () => {
  it('prefers variantId when present', () => {
    expect(
      resolveLineItemId({
        productId: 123,
        variantId: 124,
      })
    ).toBe(124);
  });

  it('falls back to productId', () => {
    expect(resolveLineItemId({ productId: 123 })).toBe(123);
  });

  it('returns null when empty', () => {
    expect(resolveLineItemId({})).toBeNull();
  });
});
