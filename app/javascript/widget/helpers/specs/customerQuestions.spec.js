import { describe, expect, it } from 'vitest';
import {
  getCustomerQuestionsConfig,
  selectVisibleCustomerQuestions,
} from '../customerQuestions';

describe('customerQuestions helpers', () => {
  const sampleConfig = {
    enabled: true,
    items: [
      {
        id: 'shipping-time',
        question: 'How long does shipping take?',
        type: 'static',
        answer: '3–5 business days.',
        enabled: true,
        targets: { all_pages: true, pages: [] },
      },
      {
        id: 'disabled',
        question: 'Hidden',
        type: 'static',
        answer: 'Nope',
        enabled: false,
        targets: { all_pages: true, pages: [] },
      },
      {
        id: 'product-only',
        question: 'Only on product pages',
        type: 'ai',
        enabled: true,
        targets: { all_pages: false, pages: ['Product'] },
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
        answer: '30 days.',
        enabled: true,
        targets: { all_pages: true, pages: [] },
      },
      {
        id: 'extra-1',
        question: 'Extra 1',
        type: 'ai',
        enabled: true,
        targets: { all_pages: true, pages: [] },
      },
      {
        id: 'extra-2',
        question: 'Extra 2',
        type: 'ai',
        enabled: true,
        targets: { all_pages: true, pages: [] },
      },
      {
        id: 'extra-3',
        question: 'Extra 3',
        type: 'ai',
        enabled: true,
        targets: { all_pages: true, pages: [] },
      },
    ],
  };

  it('returns null when customer_questions is missing or disabled', () => {
    expect(getCustomerQuestionsConfig({})).toBeNull();
    expect(
      getCustomerQuestionsConfig({
        customer_questions: { enabled: false, items: [] },
      })
    ).toBeNull();
  });

  it('filters enabled all_pages questions in order and caps at 5', () => {
    const visible = selectVisibleCustomerQuestions(sampleConfig);
    expect(visible.map(item => item.id)).toEqual([
      'shipping-time',
      'product-help',
      'returns',
      'extra-1',
      'extra-2',
    ]);
    expect(visible).toHaveLength(5);
  });

  it('returns empty list when master enabled is false', () => {
    expect(
      selectVisibleCustomerQuestions({ ...sampleConfig, enabled: false })
    ).toEqual([]);
  });
});
