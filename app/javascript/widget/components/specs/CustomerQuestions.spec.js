import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { nextTick, ref } from 'vue';
import CustomerQuestions from '../CustomerQuestions.vue';

const replace = vi.fn();
const sendMessage = vi.fn();
const setCustomerQuestionAnswerOpen = vi.fn();
const isCustomerQuestionAnswerOpen = ref(false);

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({
    dispatch: (action, payload) => {
      if (action === 'conversation/sendMessage') {
        return sendMessage(payload);
      }
      if (action === 'appConfig/setCustomerQuestionAnswerOpen') {
        isCustomerQuestionAnswerOpen.value = !!payload;
        return setCustomerQuestionAnswerOpen(payload);
      }
      return Promise.resolve();
    },
  }),
  useMapGetter: () => isCustomerQuestionAnswerOpen,
}));

const sampleQuestions = {
  enabled: true,
  items: [
    {
      id: 'shipping-time',
      question: 'How long does shipping take?',
      type: 'static',
      answer: 'Standard shipping normally takes 3–5 business days.',
      enabled: true,
      targets: { all_pages: true, pages: [] },
    },
    {
      id: 'product-help',
      question: 'Can you help me find the right product?',
      type: 'ai',
      enabled: true,
      targets: { all_pages: true, pages: [] },
    },
    {
      id: 'returns',
      question: 'What is your return policy?',
      type: 'static',
      answer: 'Returns are accepted within 30 days.',
      enabled: true,
      targets: { all_pages: true, pages: [] },
    },
  ],
};

describe('CustomerQuestions', () => {
  let store;

  const mountComponent = () =>
    mount(CustomerQuestions, {
      global: {
        plugins: [store],
      },
    });

  beforeEach(() => {
    replace.mockClear();
    sendMessage.mockClear();
    setCustomerQuestionAnswerOpen.mockClear();
    sendMessage.mockResolvedValue(undefined);
    replace.mockResolvedValue(undefined);
    isCustomerQuestionAnswerOpen.value = false;
    store = createStore({});
    window.chatwootWebChannel = {
      widgetSettings: {
        customer_questions: sampleQuestions,
      },
    };
  });

  it('renders eligible customer questions from widget_settings', () => {
    const wrapper = mountComponent();
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].text()).toContain('How long does shipping take?');
    expect(buttons[1].text()).toContain(
      'Can you help me find the right product?'
    );
  });

  it('renders nothing when customer questions are disabled', () => {
    window.chatwootWebChannel = {
      widgetSettings: {
        customer_questions: { enabled: false, items: sampleQuestions.items },
      },
    };
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="customer-questions"]').exists()).toBe(
      false
    );
  });

  it('shows the static answer locally without sending a message', async () => {
    const wrapper = mountComponent();
    await wrapper.findAll('button')[0].trigger('click');
    await nextTick();

    expect(
      wrapper.find('[data-testid="customer-question-answer"]').text()
    ).toContain('Standard shipping normally takes 3–5 business days.');
    expect(wrapper.findAll('button')).toHaveLength(1);
    expect(setCustomerQuestionAnswerOpen).toHaveBeenCalledWith(true);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('restores the question list when the header back flag clears', async () => {
    const wrapper = mountComponent();
    await wrapper.findAll('button')[0].trigger('click');
    await nextTick();
    expect(wrapper.findAll('button')).toHaveLength(1);

    isCustomerQuestionAnswerOpen.value = false;
    await nextTick();

    expect(wrapper.findAll('button')).toHaveLength(3);
    expect(
      wrapper.find('[data-testid="customer-question-answer"]').exists()
    ).toBe(false);
  });

  it('hides all questions and sends an AI question via sendMessage', async () => {
    const wrapper = mountComponent();
    await wrapper.findAll('button')[1].trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="customer-questions"]').exists()).toBe(
      false
    );
    expect(replace).toHaveBeenCalledWith({ name: 'messages' });
    expect(sendMessage).toHaveBeenCalledWith({
      content: 'Can you help me find the right product?',
    });
  });
});
