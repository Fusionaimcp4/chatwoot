/**
 * Shopify cart adapter — Online Store Ajax Cart API + cookie session.
 * Expects variant IDs from the normalized card payload (GID or numeric).
 */

const storeOrigin = () => window.location.origin;

/** Extract numeric variant id from GID or plain number/string. */
export const resolveShopifyVariantId = (payload = {}) => {
  const candidate =
    payload.variantId ?? payload.productId ?? payload.product_id ?? payload.id;
  if (candidate == null || candidate === '') return null;

  if (typeof candidate === 'number') {
    return Number.isFinite(candidate) ? candidate : null;
  }

  const asString = String(candidate).trim();
  if (!asString) return null;

  const gidMatch = asString.match(/^gid:\/\/shopify\/ProductVariant\/(\d+)$/i);
  if (gidMatch) return Number(gidMatch[1]);

  if (/^\d+$/.test(asString)) return Number(asString);

  return null;
};

const itemsCountFromCart = cart => {
  if (!cart || typeof cart !== 'object') return 0;
  if (typeof cart.item_count === 'number') return cart.item_count;
  if (Array.isArray(cart.items)) {
    return cart.items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0
    );
  }
  return 0;
};

const fetchCart = async () => {
  const response = await fetch(`${storeOrigin()}/cart.js`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Shopify cart (${response.status})`);
  }

  const data = await response.json();
  return { data, itemsCount: itemsCountFromCart(data) };
};

const notifyThemeCartUpdated = () => {
  try {
    document.documentElement.dispatchEvent(
      new CustomEvent('cart:updated', { bubbles: true })
    );
    window.dispatchEvent(new CustomEvent('voxedesk:cart-updated'));
  } catch {
    // Theme refresh is optional.
  }
};

export const shopifyCartAdapter = {
  async addItem(payload = {}) {
    const id = resolveShopifyVariantId(payload);
    if (id == null) {
      throw new Error('Missing Shopify variant id');
    }
    const quantity = Number(payload.quantity) || 1;

    const response = await fetch(`${storeOrigin()}/cart/add.js`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ id, quantity }],
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorBody = await response.json();
        detail = errorBody?.description || errorBody?.message || '';
      } catch {
        // ignore
      }
      throw new Error(detail || `Failed to add item (${response.status})`);
    }

    await response.json();
    notifyThemeCartUpdated();

    const { itemsCount } = await fetchCart();
    return { itemsCount };
  },

  async getItemsCount() {
    const { itemsCount } = await fetchCart();
    return itemsCount;
  },

  openCart() {
    window.open(`${storeOrigin()}/cart`, '_blank', 'noopener,noreferrer');
  },
};
