export const CUSTOMER_QUESTIONS_MAX = 5;

const asObject = value =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

/**
 * Read customer_questions from widget_settings (bootstrap).
 * Returns null when missing/disabled so the Home UI can skip rendering.
 */
export const getCustomerQuestionsConfig = (widgetSettings = {}) => {
  const settings = asObject(widgetSettings);
  const config =
    settings.customer_questions || settings.customerQuestions || null;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }
  if (config.enabled !== true) {
    return null;
  }
  return config;
};

/**
 * Eligible questions for Home:
 * enabled item + targets.all_pages === true, preserve order, max 5.
 * Page-target matching is intentionally not implemented yet.
 */
export const selectVisibleCustomerQuestions = (
  config,
  { max = CUSTOMER_QUESTIONS_MAX } = {}
) => {
  if (!config || config.enabled !== true) {
    return [];
  }

  const items = Array.isArray(config.items) ? config.items : [];
  return items
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (item.enabled !== true) return false;
      if (!item.id || !item.question) return false;
      if (item.type !== 'static' && item.type !== 'ai') return false;
      if (item.type === 'static' && !String(item.answer || '').trim())
        return false;
      const targets = asObject(item.targets);
      return targets.all_pages === true;
    })
    .slice(0, max)
    .map(item => ({
      id: String(item.id),
      question: String(item.question),
      type: item.type,
      answer: item.type === 'static' ? String(item.answer) : undefined,
    }));
};
