<script>
import { mapGetters } from 'vuex';
import { IFrameHelper } from 'widget/helpers/utils';

export default {
  components: {},
  props: {
    action: {
      type: Object,
      default: () => {},
    },
  },
  computed: {
    ...mapGetters({
      widgetColor: 'appConfig/getWidgetColor',
    }),
    isLink() {
      return this.action.type === 'link';
    },
  },
  methods: {
    onClick() {
      if (this.action.type === 'postback') {
        // Send message to parent iframe
        if (IFrameHelper.isIFrame()) {
          IFrameHelper.sendMessage({
            event: 'postback',
            data: { payload: this.action.payload },
          });
        }
      }
    },
  },
};
</script>

<template>
  <a
    v-if="isLink"
    :key="action.uri"
    class="action-button"
    :href="action.uri"
    :style="{
      borderColor: widgetColor,
      color: widgetColor,
    }"
    target="_blank"
    rel="noopener nofollow noreferrer"
  >
    {{ action.text }}
  </a>
  <button
    v-else
    :key="action.payload"
    class="action-button"
    :style="{ borderColor: widgetColor, color: widgetColor }"
    @click="onClick"
  >
    {{ action.text }}
  </button>
</template>

<style scoped lang="scss">
.action-button {
  @apply inline-flex items-center justify-center rounded-md border border-solid bg-transparent px-2 py-0.5 text-[11px] font-medium leading-4 no-underline transition-opacity hover:opacity-80;
}
</style>
