/**
 * Provider-agnostic product options helpers.
 * Expects the card postback contract from n8n:
 * { productId, options[{ name, values }], variants[{ id, available, optionValues }] }
 */

export const OPEN_PRODUCT_OPTIONS = 'OPEN_PRODUCT_OPTIONS';
export const CLOSE_PRODUCT_OPTIONS = 'CLOSE_PRODUCT_OPTIONS';

const normalizeToken = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const toId = value => {
  if (value == null || value === '') return null;
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? null : asNumber;
};

/**
 * Keep only option groups that actually appear on at least one variant.
 * Drops parent-only attributes (e.g. "size" listed on the product but
 * missing from variation optionValues).
 */
const optionsPresentOnVariants = (options, variants) => {
  const keysUsed = new Set();
  variants.forEach(variant => {
    Object.keys(variant.optionValues || {}).forEach(key => keysUsed.add(key));
  });
  if (!keysUsed.size) return [];
  return options.filter(opt => keysUsed.has(opt.name));
};

export const normalizeProductOptions = (payload = {}) => {
  const variants = Array.isArray(payload.variants)
    ? payload.variants
        .map(variant => {
          const id = toId(variant.id);
          if (id == null) return null;
          return {
            id,
            price: variant.price ?? '',
            available: variant.available !== false,
            optionValues:
              variant.optionValues && typeof variant.optionValues === 'object'
                ? variant.optionValues
                : {},
          };
        })
        .filter(Boolean)
    : [];

  const rawOptions = Array.isArray(payload.options)
    ? payload.options
        .map(opt => ({
          name: typeof opt.name === 'string' ? opt.name.trim() : '',
          values: Array.isArray(opt.values)
            ? opt.values.map(v => String(v)).filter(Boolean)
            : [],
        }))
        .filter(opt => opt.name && opt.values.length)
    : [];

  const options = variants.length
    ? optionsPresentOnVariants(rawOptions, variants)
    : rawOptions;

  return {
    action: payload.action || 'add_to_cart',
    provider: payload.provider || 'woocommerce',
    productId: payload.productId ?? null,
    quantity: Number(payload.quantity) || 1,
    title: payload.title || '',
    options,
    variants,
  };
};

/** Open the sheet when the customer must pick among available variants. */
export const needsSelection = payload => {
  const model = normalizeProductOptions(payload);
  const available = model.variants.filter(v => v.available);
  if (available.length <= 1) return false;
  return model.options.length > 0;
};

export const findMatchingVariant = (variants, selections) => {
  const entries = Object.entries(selections);
  if (!entries.length) return null;

  return (
    variants.find(variant => {
      if (!variant.available) return false;
      const optionValues = variant.optionValues || {};

      return entries.every(([name, value]) => {
        if (!(name in optionValues)) return false;
        return normalizeToken(optionValues[name]) === normalizeToken(value);
      });
    }) || null
  );
};

/** Whether choosing `value` for `optionName` can still reach an available variant. */
export const isOptionValueEnabled = ({
  optionName,
  value,
  selections,
  variants,
  optionNames,
}) => {
  if (!variants.length) return true;

  const trial = { ...selections, [optionName]: value };
  const selectedNames = optionNames.filter(name => trial[name]);

  return variants.some(variant => {
    if (!variant.available) return false;
    const optionValues = variant.optionValues || {};

    return selectedNames.every(name => {
      if (!(name in optionValues)) return false;
      return normalizeToken(optionValues[name]) === normalizeToken(trial[name]);
    });
  });
};

export const formatDisplayPrice = price => {
  if (price == null || price === '') return '';
  if (typeof price === 'number') return `$${price.toFixed(2)}`;
  const asString = String(price).trim();
  if (!asString) return '';
  if (/[$€£]/.test(asString)) return asString;
  const numeric = Number(asString);
  if (!Number.isNaN(numeric)) return `$${numeric.toFixed(2)}`;
  return asString;
};
