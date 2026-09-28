/**
 * WooCommerce cart adapter — Store API + cookie session only.
 * Theme mini-cart refresh is best-effort (Gorgias-style).
 */

const storeOrigin = () => window.location.origin;

let sessionNonce = '';

const readHeader = (response, name) =>
  response.headers.get(name) || response.headers.get(name.toLowerCase());

const captureNonce = response => {
  sessionNonce =
    readHeader(response, 'Nonce') ||
    readHeader(response, 'X-WC-Store-API-Nonce') ||
    sessionNonce;
};

const itemsCountFromCart = cart => {
  if (!cart || typeof cart !== 'object') return 0;
  if (typeof cart.items_count === 'number') return cart.items_count;
  if (Array.isArray(cart.items)) {
    return cart.items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0
    );
  }
  return 0;
};

/** Numeric store line id from variantId or productId. */
export const resolveLineItemId = (payload = {}) => {
  const candidate =
    payload.variantId ?? payload.productId ?? payload.product_id ?? payload.id;
  if (candidate == null || candidate === '') return null;
  const asNumber = Number(candidate);
  return Number.isNaN(asNumber) ? null : asNumber;
};

const storeApiHeaders = ({ json = false } = {}) => {
  const headers = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  if (sessionNonce) {
    headers.Nonce = sessionNonce;
    headers['X-WC-Store-API-Nonce'] = sessionNonce;
  }
  return headers;
};

const fetchCart = async () => {
  const response = await fetch(`${storeOrigin()}/wp-json/wc/store/v1/cart`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: storeApiHeaders(),
  });
  captureNonce(response);

  if (!response.ok) {
    throw new Error(`Failed to fetch cart (${response.status})`);
  }

  const data = await response.json();
  return { data, itemsCount: itemsCountFromCart(data) };
};

const notifyThemeCartUpdated = () => {
  try {
    const $ = window.jQuery || window.$;
    if ($ && typeof $.fn !== 'undefined') {
      $(document.body).trigger('wc_fragment_refresh');
      $(document.body).trigger('added_to_cart');
    }
    window.dispatchEvent(new CustomEvent('voxedesk:cart-updated'));
  } catch {
    // Theme refresh is optional.
  }
};

export const woocommerceCartAdapter = {
  async addItem(payload = {}) {
    const id = resolveLineItemId(payload);
    if (id == null) {
      throw new Error('Missing WooCommerce product id');
    }
    const quantity = Number(payload.quantity) || 1;

    await fetchCart();

    const response = await fetch(
      `${storeOrigin()}/wp-json/wc/store/v1/cart/add-item`,
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: storeApiHeaders({ json: true }),
        body: JSON.stringify({
          id: Number(id),
          quantity,
        }),
      }
    );
    captureNonce(response);

    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.json())?.message || '';
      } catch {
        // ignore
      }
      throw new Error(detail || `Failed to add item (${response.status})`);
    }

    const data = await response.json();
    notifyThemeCartUpdated();

    return { itemsCount: itemsCountFromCart(data) };
  },

  async getItemsCount() {
    const { itemsCount } = await fetchCart();
    return itemsCount;
  },

  openCart() {
    window.open(`${storeOrigin()}/cart`, '_blank', 'noopener,noreferrer');
  },
};
