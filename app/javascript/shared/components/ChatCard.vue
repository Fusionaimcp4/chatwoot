<script>
import { mapActions } from 'vuex';
import { IFrameHelper } from 'widget/helpers/utils';

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
    primaryAction() {
      if (!this.actions?.length) return null;
      return (
        this.actions.find(action => action.type === 'link') || this.actions[0]
      );
    },
    isClickable() {
      return Boolean(this.primaryAction);
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
    activatePrimaryAction() {
      const action = this.primaryAction;
      if (!action) return;

      if (action.type === 'link' && action.uri) {
        window.open(action.uri, '_blank', 'noopener,noreferrer');
        return;
      }

      if (action.type === 'postback' && IFrameHelper.isIFrame()) {
        IFrameHelper.sendMessage({
          event: 'postback',
          data: { payload: action.payload },
        });
      }
    },
    onCardActivate() {
      this.activatePrimaryAction();
    },
    onCardKeydown(event) {
      if (!this.isClickable) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.activatePrimaryAction();
      }
    },
    onPrimaryButtonClick(event) {
      event.stopPropagation();
      this.activatePrimaryAction();
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
        <button
          type="button"
          class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-n-weak bg-n-background text-n-slate-12 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-n-solid-3"
          aria-label="Find similar products"
          :disabled="isSendingSimilar"
          @click="onAiButtonClick"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10.5 3.5c.2 1.9 1.1 3.4 2.5 4.5-1.4 1.1-2.3 2.6-2.5 4.5-.2-1.9-1.1-3.4-2.5-4.5 1.4-1.1 2.3-2.6 2.5-4.5Z"
            />
            <path
              d="M17.5 2.5c.12 1.15.68 2.05 1.5 2.7-.82.65-1.38 1.55-1.5 2.7-.12-1.15-.68-2.05-1.5-2.7.82-.65 1.38-1.55 1.5-2.7Z"
            />
            <path
              d="M16.5 12c.15 1.4.85 2.5 1.9 3.3-1.05.8-1.75 1.9-1.9 3.3-.15-1.4-.85-2.5-1.9-3.3 1.05-.8 1.75-1.9 1.9-3.3Z"
            />
          </svg>
        </button>

        <button
          v-if="primaryAction"
          type="button"
          class="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-n-weak bg-n-background text-n-slate-12 shadow-sm transition-opacity hover:opacity-90 dark:bg-n-solid-3"
          :aria-label="primaryAction.text || 'View product'"
          @click="onPrimaryButtonClick"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3.5 5.5h1.2l.4 1.5h12.6a1 1 0 0 1 .98 1.2l-1.1 5.2a1.5 1.5 0 0 1-1.47 1.2H8.1a1.5 1.5 0 0 1-1.47-1.2L5.2 5.5H3.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="9" cy="18.5" r="1.25" fill="currentColor" />
            <circle cx="15.5" cy="18.5" r="1.25" fill="currentColor" />
            <path
              d="M17.5 3.5v4M15.5 5.5h4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
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
