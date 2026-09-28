<script setup>
import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  findMatchingVariant,
  formatDisplayPrice,
  isOptionValueEnabled,
} from 'widget/helpers/productOptions';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  mediaUrl: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  variants: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close', 'confirm']);

const { t } = useI18n();

const selections = reactive({});

const optionNames = computed(() => props.options.map(opt => opt.name));

const resetSelections = () => {
  Object.keys(selections).forEach(key => {
    delete selections[key];
  });
};

watch(
  () => props.open,
  isOpen => {
    if (isOpen) resetSelections();
  }
);

watch(
  () => props.variants,
  () => {
    if (props.open) resetSelections();
  }
);

const allOptionsSelected = computed(() =>
  optionNames.value.every(name => Boolean(selections[name]))
);

const selectedVariant = computed(() => {
  if (!allOptionsSelected.value) return null;
  return findMatchingVariant(props.variants, { ...selections });
});

const canAddToCart = computed(() => Boolean(selectedVariant.value?.id));

const displayPrice = computed(() => {
  if (!selectedVariant.value) return '';
  return formatDisplayPrice(selectedVariant.value.price);
});

const selectValue = (optionName, value) => {
  if (selections[optionName] === value) {
    delete selections[optionName];
    return;
  }
  selections[optionName] = value;
};

const isSelected = (optionName, value) => selections[optionName] === value;

const isEnabled = (optionName, value) =>
  isOptionValueEnabled({
    optionName,
    value,
    selections: { ...selections },
    variants: props.variants,
    optionNames: optionNames.value,
  });

const onConfirm = () => {
  if (!selectedVariant.value?.id) return;
  emit('confirm', {
    variantId: selectedVariant.value.id,
    selections: { ...selections },
  });
};

const onClose = () => emit('close');
</script>

<template>
  <div
    v-show="open"
    class="absolute inset-0 z-[60] flex flex-col justify-end overflow-hidden"
  >
    <button
      type="button"
      class="absolute inset-0 border-0 bg-n-alpha-black2 transition-opacity duration-300"
      :aria-label="t('PRODUCT_OPTIONS.CLOSE')"
      @click="onClose"
    />

    <section
      class="relative z-10 flex max-h-[85%] w-full flex-col rounded-t-2xl border border-n-weak bg-n-background shadow-lg transition-transform duration-300 ease-out dark:bg-n-solid-2"
      :class="open ? 'translate-y-0' : 'translate-y-full'"
      role="dialog"
      aria-modal="true"
      :aria-label="title || t('PRODUCT_OPTIONS.SELECT_OPTIONS')"
    >
      <header
        class="relative flex shrink-0 items-start gap-3 border-b border-n-weak px-4 pb-3 pt-4"
      >
        <div
          v-if="mediaUrl"
          class="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-n-alpha-1 dark:bg-n-alpha-2"
        >
          <img
            :src="mediaUrl"
            :alt="title"
            class="h-full w-full object-contain p-1"
          />
        </div>
        <div class="min-w-0 flex-1 pr-8">
          <h3
            class="m-0 line-clamp-2 text-sm font-semibold leading-snug text-n-slate-12"
          >
            {{ title || t('PRODUCT_OPTIONS.SELECT_OPTIONS') }}
          </h3>
          <p
            v-if="displayPrice"
            class="mt-1 text-sm font-semibold text-n-slate-12"
          >
            {{ displayPrice }}
          </p>
          <p v-else class="mt-1 text-xs text-n-slate-10">
            {{ t('PRODUCT_OPTIONS.SELECT_OPTIONS') }}
          </p>
        </div>
        <button
          type="button"
          class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-n-slate-11 transition-opacity hover:opacity-80"
          :aria-label="t('PRODUCT_OPTIONS.CLOSE')"
          @click="onClose"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div
          v-for="option in options"
          :key="option.name"
          class="mb-5 last:mb-0"
        >
          <p class="mb-2 text-xs font-medium text-n-slate-11">
            {{ option.name }}
            <span
              v-if="selections[option.name]"
              class="font-normal text-n-slate-10"
            >
              {{
                t('PRODUCT_OPTIONS.SELECTED_VALUE', {
                  value: selections[option.name],
                })
              }}
            </span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="value in option.values"
              :key="`${option.name}-${value}`"
              type="button"
              class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              :class="
                isSelected(option.name, value)
                  ? 'border-n-slate-12 bg-n-slate-12 text-n-background'
                  : isEnabled(option.name, value)
                    ? 'border-n-weak bg-n-background text-n-slate-12 hover:border-n-slate-10 dark:bg-n-solid-3'
                    : 'cursor-not-allowed border-n-weak bg-n-alpha-1 text-n-slate-8 opacity-50'
              "
              :disabled="!isEnabled(option.name, value)"
              @click="selectValue(option.name, value)"
            >
              {{ value }}
            </button>
          </div>
        </div>
      </div>

      <footer
        class="shrink-0 border-t border-n-weak bg-n-background px-4 pb-3 pt-3 dark:bg-n-solid-2"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <span class="text-xs text-n-slate-10">
            {{ t('PRODUCT_OPTIONS.PRICE') }}
          </span>
          <span class="text-sm font-semibold text-n-slate-12">
            {{ displayPrice || t('PRODUCT_OPTIONS.PRICE_UNAVAILABLE') }}
          </span>
        </div>
        <button
          type="button"
          class="flex w-full items-center justify-center rounded-full bg-n-slate-12 px-4 py-3 text-sm font-semibold text-n-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canAddToCart"
          @click="onConfirm"
        >
          {{ t('PRODUCT_OPTIONS.ADD_TO_CART') }}
        </button>
      </footer>
    </section>
  </div>
</template>
