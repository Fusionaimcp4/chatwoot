<script>
import { mapActions } from 'vuex';
import { IFrameHelper } from 'widget/helpers/utils';
import { emitter } from 'shared/helpers/mitt';
import {
  needsSelection,
  normalizeProductOptions,
  OPEN_PRODUCT_OPTIONS,
} from 'widget/helpers/productOptions';

export default {
  props: {
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    actions: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      isSendingSimilar: false,
    };
  },
  computed: {
    priceDetails() {
      const raw = (this.description || '').replace(/^Price:\s*/i, '').trim();
      const stockMatch = raw.match(/^(.*?)\s+(in stock|out of stock)$/i);

      if (stockMatch) {
        const stockLabel = stockMatch[2].toLowerCase();
        return {
          price: stockMatch[1],
          stock: stockLabel === 'in stock' ? 'In stock' : 'Out of stock',
          isInStock: stockLabel === 'in stock',
        };
      }

      return {
        price: raw,
        stock: '',
        isInStock: false,
      };
    },
    viewAction() {
      return this.actions?.find(action => action.type === 'link') || null;
    },
    cartAction() {
      return this.actions?.find(action => action.type === 'postback') || null;
    },
    isClickable() {
      return Boolean(this.viewAction);
    },
    similarProductsMessage() {
      const productName = (this.title || '').trim();
      if (!productName) {
        return 'Show me similar products';
      }
      return `Show me products similar to ${productName}`;
    },
  },
  methods: {
    ...mapActions('conversation', ['sendMessage']),
    normalizeUrl(value) {
      if (!value || typeof value !== 'string') return '';
      const markdownMatch = value.match(/\((https?:\/\/[^)\s]+)\)/);
      if (markdownMatch) return markdownMatch[1];
      return value.trim();
    },
    parseCartPayload(action) {
      const raw = action?.payload;
      if (raw == null || raw === '') return null;
      if (typeof raw === 'object') return raw;

      try {
        let parsed = JSON.parse(String(raw));
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        return typeof parsed === 'object' && parsed !== null ? parsed : null;
      } catch {
        return null;
      }
    },
    sendAddToCart({ provider, productId, variantId, quantity }) {
      IFrameHelper.sendMessage({
        event: 'add-to-cart',
        data: {
          provider: provider || 'woocommerce',
          productId,
          variantId,
          quantity: quantity || 1,
        },
      });
    },
    addToCart() {
      const payload = this.parseCartPayload(this.cartAction);
      if (!payload) return;

      const actionType = payload.action || payload.type;
      if (actionType && actionType !== 'add_to_cart') return;

      const model = normalizeProductOptions({
        ...payload,
        title: payload.title || this.title,
      });

      if (needsSelection(model)) {
        emitter.emit(OPEN_PRODUCT_OPTIONS, {
          ...model,
          mediaUrl: this.mediaUrl,
          title: model.title || this.title,
        });
        return;
      }

      // Single / no options: add with productId (+ sole variant id when present).
      const singleVariant = model.variants.find(v => v.available);
      this.sendAddToCart({
        provider: model.provider,
        productId: model.productId,
        variantId: singleVariant?.id,
        quantity: model.quantity,
      });
    },
    activateViewProduct() {
      const uri = this.normalizeUrl(this.viewAction?.uri);
      if (!uri) return;
      window.open(uri, '_blank', 'noopener,noreferrer');
    },
    onCardActivate() {
      this.activateViewProduct();
    },
    onCardKeydown(event) {
      if (!this.isClickable) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.activateViewProduct();
      }
    },
    onPrimaryButtonClick(event) {
      event.stopPropagation();
      this.addToCart();
    },
    async onAiButtonClick(event) {
      event.stopPropagation();
      if (this.isSendingSimilar) return;

      this.isSendingSimilar = true;
      try {
        await this.sendMessage({
          content: this.similarProductsMessage,
        });
      } finally {
        this.isSendingSimilar = false;
      }
    },
  },
};
</script>

<template>
  <div
    class="card-message flex h-full w-full flex-col rounded-2xl border border-n-weak bg-n-background p-2 dark:bg-n-solid-3"
    :class="{ 'cursor-pointer': isClickable }"
    :role="isClickable ? 'link' : undefined"
    :tabindex="isClickable ? 0 : undefined"
    @click="onCardActivate"
    @keydown="onCardKeydown"
  >
    <div class="relative shrink-0">
      <div
        class="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-n-alpha-1 p-5 dark:bg-n-alpha-2"
      >
        <img
          v-if="mediaUrl"
          class="max-h-full max-w-full object-contain"
          :src="mediaUrl"
          :alt="title"
        />
      </div>

      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-2 pb-2"
      >
        <!-- Find similar products -->
        <button
          type="button"
          class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-n-weak bg-n-background shadow-sm transition-transform duration-150 hover:scale-110 disabled:opacity-50 dark:bg-n-solid-3"
          :aria-label="$t('PRODUCT_CARD.FIND_SIMILAR')"
          :disabled="isSendingSimilar"
          @click="onAiButtonClick"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 18"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <g stroke="#4B5563" stroke-linecap="round" stroke-width="1.45">
              <path
                stroke-linejoin="round"
                d="M13.168 4.234a3.85 3.85 0 0 1-2.435 2.434L9.74 7l.993.332a3.85 3.85 0 0 1 2.435 2.435l.332.993.332-.993a3.85 3.85 0 0 1 2.435-2.435L17.261 7l-.994-.332a3.85 3.85 0 0 1-2.435-2.434l-.332-.995z"
              />
              <path
                d="M4.5 6.457A3.5 3.5 0 0 1 2.958 8 3.5 3.5 0 0 1 4.5 9.542 3.5 3.5 0 0 1 6.043 8 3.5 3.5 0 0 1 4.5 6.457Z"
              />
              <path
                d="M8.517 2.095c-.21.398-.53.729-.921.952.397.21.728.53.951.921.21-.398.531-.728.922-.951a2.4 2.4 0 0 1-.952-.922Z"
              />
            </g>
          </svg>
        </button>

        <!-- Add to cart -->
        <button
          v-if="cartAction"
          type="button"
          class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-n-weak bg-n-background shadow-sm transition-transform duration-150 hover:scale-110 dark:bg-n-solid-3"
          :aria-label="$t('PRODUCT_CARD.ADD_TO_CART')"
          @click="onPrimaryButtonClick"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <path
              stroke="#4B5563"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16.608 9.421V6.906H3.392v8.016c0 .567.224 1.112.624 1.513.4.402.941.627 1.506.627H8.63M8.818 3h2.333c.618 0 1.212.247 1.649.686a2.35 2.35 0 0 1 .683 1.658v1.562H6.486V5.344c0-.622.246-1.218.683-1.658A2.33 2.33 0 0 1 8.82 3M13 14.5h5M15.5 12v5"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1 px-1 pb-1 pt-2">
      <h4
        class="m-0 line-clamp-2 text-[13px] font-semibold leading-[1.3] tracking-[-0.01em] text-n-slate-12"
      >
        {{ title }}
      </h4>
      <div
        v-if="priceDetails.price"
        class="flex flex-wrap items-center gap-x-1.5"
      >
        <span class="text-[13px] font-semibold leading-none text-n-slate-12">
          {{ priceDetails.price }}
        </span>
        <span
          v-if="priceDetails.stock"
          class="inline-flex items-center gap-1 text-[11px] font-normal leading-none text-n-slate-10"
        >
          <span
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            :class="priceDetails.isInStock ? 'bg-n-teal-10' : 'bg-n-slate-8'"
          />
          {{ priceDetails.stock }}
        </span>
      </div>
    </div>
  </div>
</template>
