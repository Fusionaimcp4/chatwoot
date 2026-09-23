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

  beforeEach(() => {
    window.chatwootWebChannel = {
      enabledFeatures: [],
    };
    IFrameHelper.isIFrame.mockReturnValue(true);
    IFrameHelper.sendMessage.mockClear();
    RNHelper.isRNWebView.mockReturnValue(false);
    RNHelper.sendMessage.mockClear();

    store = createStore({
      modules: {
        appConfig: {
          namespaced: true,
          getters: {
            getCanUserEndConversation: () => true,
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
});
