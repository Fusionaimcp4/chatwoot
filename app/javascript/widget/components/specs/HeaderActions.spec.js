import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';

import HeaderActions from '../HeaderActions.vue';
import { IFrameHelper, RNHelper } from 'widget/helpers/utils';

vi.mock('widget/helpers/utils', () => ({
  IFrameHelper: {
    isIFrame: vi.fn(),
    sendMessage: vi.fn(),
  },
  RNHelper: {
    isRNWebView: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

describe('HeaderActions', () => {
  let store;
  let setWidgetLayout;
  let isMobile = false;

  const mountComponent = props =>
    shallowMount(HeaderActions, {
      global: {
        plugins: [store],
        mocks: {
          $t: message => message,
        },
        stubs: {
          FluentIcon: true,
        },
      },
      props: props || {},
    });

  const buildStore = ({ widgetLayout = 'compact', mobile = false } = {}) => {
    isMobile = mobile;
    setWidgetLayout = vi.fn();
    return createStore({
      modules: {
        appConfig: {
          namespaced: true,
          getters: {
            getCanUserEndConversation: () => true,
            getCartItemsCount: () => 0,
            getWidgetLayout: () => widgetLayout,
            getIsMobile: () => isMobile,
          },
          actions: {
            setWidgetLayout: (_, layout) => setWidgetLayout(layout),
          },
        },
        conversationAttributes: {
          namespaced: true,
          state: () => ({ status: '' }),
          getters: {
            getConversationParams: state => state,
          },
        },
      },
    });
  };

  beforeEach(() => {
    window.chatwootWebChannel = {
      enabledFeatures: [],
      widgetSettings: { layout: 'compact' },
    };
    IFrameHelper.isIFrame.mockReturnValue(true);
    IFrameHelper.sendMessage.mockClear();
    RNHelper.isRNWebView.mockReturnValue(false);
    RNHelper.sendMessage.mockClear();
    store = buildStore();
  });

  it('uses the header close action for an embedded widget', async () => {
    const wrapper = mountComponent();
    const closeButton = wrapper.get('.close-button');

    expect(closeButton.attributes('aria-label')).toBe(
      'UNREAD_VIEW.CLOSE_MESSAGES_BUTTON'
    );

    await closeButton.trigger('click');

    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'closeWindow',
    });
  });

  it('does not render an inert close action outside an embed', () => {
    IFrameHelper.isIFrame.mockReturnValue(false);
    const wrapper = mountComponent({ showPopoutButton: true });

    expect(wrapper.find('.close-button').exists()).toBe(false);
    expect(wrapper.find('.new-window--button').exists()).toBe(true);
  });

  it('shows the layout toggle on desktop embeds only', () => {
    store = buildStore({ mobile: false });
    const desktop = mountComponent();
    expect(desktop.find('.layout-toggle-button').exists()).toBe(true);

    store = buildStore({ mobile: true });
    const mobile = mountComponent();
    expect(mobile.find('.layout-toggle-button').exists()).toBe(false);
  });

  it('toggles compact to expanded immediately and notifies the parent', async () => {
    const wrapper = mountComponent();
    const toggle = wrapper.get('.layout-toggle-button');

    expect(toggle.attributes('aria-label')).toBe('HEADER.EXPAND_CHAT');

    await toggle.trigger('click');

    expect(setWidgetLayout).toHaveBeenCalledWith('expanded');
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'set-widget-layout',
      layout: 'expanded',
    });
  });

  it('toggles expanded to compact', async () => {
    store = buildStore({ widgetLayout: 'expanded' });
    const wrapper = mountComponent();
    const toggle = wrapper.get('.layout-toggle-button');

    expect(toggle.attributes('aria-label')).toBe('HEADER.COMPACT_CHAT');

    await toggle.trigger('click');

    expect(setWidgetLayout).toHaveBeenCalledWith('compact');
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith({
      event: 'set-widget-layout',
      layout: 'compact',
    });
  });
});
