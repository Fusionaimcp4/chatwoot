<script>
import { mapActions, mapGetters } from 'vuex';
import { IFrameHelper, RNHelper } from 'widget/helpers/utils';
import { popoutChatWindow } from '../helpers/popoutHelper';
import FluentIcon from 'shared/components/FluentIcon/Index.vue';
import configMixin from 'widget/mixins/configMixin';
import { CONVERSATION_STATUS } from 'shared/constants/messages';

export default {
  name: 'HeaderActions',
  components: { FluentIcon },
  mixins: [configMixin],
  props: {
    showPopoutButton: {
      type: Boolean,
      default: false,
    },
    showEndConversationButton: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    ...mapGetters({
      conversationAttributes: 'conversationAttributes/getConversationParams',
      canUserEndConversation: 'appConfig/getCanUserEndConversation',
      cartItemsCount: 'appConfig/getCartItemsCount',
      storedWidgetLayout: 'appConfig/getWidgetLayout',
      isMobileViewport: 'appConfig/getIsMobile',
    }),
    canLeaveConversation() {
      return [
        CONVERSATION_STATUS.OPEN,
        CONVERSATION_STATUS.SNOOZED,
        CONVERSATION_STATUS.PENDING,
      ].includes(this.conversationStatus);
    },
    isIframe() {
      return IFrameHelper.isIFrame();
    },
    isRNWebView() {
      return RNHelper.isRNWebView();
    },
    showHeaderActions() {
      return this.isIframe || this.isRNWebView || this.hasWidgetOptions;
    },
    conversationStatus() {
      return this.conversationAttributes.status;
    },
    hasWidgetOptions() {
      return this.showPopoutButton || this.conversationStatus === 'open';
    },
    showCartButton() {
      return (this.isIframe || this.isRNWebView) && this.cartItemsCount > 0;
    },
    cartBadgeLabel() {
      return this.cartItemsCount > 99 ? '99+' : String(this.cartItemsCount);
    },
    effectiveWidgetLayout() {
      return (
        this.storedWidgetLayout ||
        this.channelConfig?.widgetSettings?.layout ||
        'compact'
      );
    },
    isExpandedLayout() {
      return this.effectiveWidgetLayout === 'expanded';
    },
    showLayoutToggle() {
      // Use parent-reported mobile flag. Iframe matchMedia is wrong because the
      // compact holder is ~400px wide even on desktop parent pages.
      return this.isIframe && !this.isMobileViewport;
    },
    layoutToggleLabel() {
      return this.isExpandedLayout
        ? this.$t('HEADER.COMPACT_CHAT')
        : this.$t('HEADER.EXPAND_CHAT');
    },
  },
  methods: {
    ...mapActions('appConfig', ['setWidgetLayout']),
    popoutWindow() {
      this.closeWindow();
      const {
        location: { origin },
        chatwootWebChannel: { websiteToken },
        authToken,
      } = window;
      popoutChatWindow(
        origin,
        websiteToken,
        this.$root.$i18n.locale,
        authToken
      );
    },
    closeWindow() {
      if (IFrameHelper.isIFrame()) {
        IFrameHelper.sendMessage({ event: 'closeWindow' });
      } else if (RNHelper.isRNWebView) {
        RNHelper.sendMessage({ type: 'close-widget' });
      }
    },
    resolveConversation() {
      this.$store.dispatch('conversation/resolveConversation');
    },
    openCart() {
      if (IFrameHelper.isIFrame()) {
        IFrameHelper.sendMessage({ event: 'open-cart' });
      }
    },
    toggleWidgetLayout() {
      const nextLayout = this.isExpandedLayout ? 'compact' : 'expanded';
      this.setWidgetLayout(nextLayout);
      if (IFrameHelper.isIFrame()) {
        IFrameHelper.sendMessage({
          event: 'set-widget-layout',
          layout: nextLayout,
        });
      }
    },
  },
};
</script>

<!-- eslint-disable-next-line vue/no-root-v-if -->
<template>
  <div v-if="showHeaderActions" class="actions flex items-center gap-3">
    <button
      v-if="
        canLeaveConversation &&
        canUserEndConversation &&
        hasEndConversationEnabled &&
        showEndConversationButton
      "
      class="button transparent compact"
      :title="$t('END_CONVERSATION')"
      @click="resolveConversation"
    >
      <FluentIcon icon="sign-out" size="22" class="text-n-slate-12" />
    </button>
    <button
      v-if="showLayoutToggle"
      type="button"
      class="button transparent compact layout-toggle-button"
      :title="layoutToggleLabel"
      :aria-label="layoutToggleLabel"
      @click="toggleWidgetLayout"
    >
      <!-- Stroke icons match cart weight/color; Fluent fill icons looked heavier -->
      <svg
        v-if="!isExpandedLayout"
        class="h-[22px] w-[22px] text-n-slate-12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg
        v-else
        class="h-[22px] w-[22px] text-n-slate-12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      v-if="showPopoutButton"
      class="button transparent compact new-window--button"
      @click="popoutWindow"
    >
      <FluentIcon icon="open" size="22" class="text-n-slate-12" />
    </button>
    <button
      v-if="showCartButton"
      type="button"
      class="relative button transparent compact"
      :title="$t('HEADER.CART')"
      :aria-label="$t('HEADER.CART')"
      @click="openCart"
    >
      <svg
        class="h-[22px] w-[22px] text-n-slate-12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3.5 5.5h1.2l.4 1.5h12.6a1 1 0 0 1 .98 1.2l-1.1 5.2a1.5 1.5 0 0 1-1.47 1.2H8.1a1.5 1.5 0 0 1-1.47-1.2L5.2 5.5H3.5"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="9" cy="18.5" r="1.15" fill="currentColor" />
        <circle cx="15.5" cy="18.5" r="1.15" fill="currentColor" />
      </svg>
      <span
        class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-n-slate-12 px-1 text-[10px] font-semibold leading-none text-n-background"
      >
        {{ cartBadgeLabel }}
      </span>
    </button>
    <button
      v-if="isIframe || isRNWebView"
      class="button transparent compact close-button"
      :title="$t('UNREAD_VIEW.CLOSE_MESSAGES_BUTTON')"
      :aria-label="$t('UNREAD_VIEW.CLOSE_MESSAGES_BUTTON')"
      @click="closeWindow"
    >
      <FluentIcon icon="dismiss" size="24" class="text-n-slate-12" />
    </button>
  </div>
</template>
