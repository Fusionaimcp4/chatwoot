const SMART_PAGE_CONTEXT_OWNER = '__voxeSmartPageContextOwner';
const SMART_PAGE_CONTEXT_OWNER_SDK = 'sdk';
const RUNTIME_PATH = '/widget/runtime.js';
const CHAT_START_URL_KEY = 'voxe_chat_start_url';

export const SMART_PAGE_CONTEXT_FIELDS = [
  'page_title',
  'current_page_url',
  'last_context_update_at',
  'chat_start_url',
  'referrer',
  'page_type',
];

const getRoot = () => window;

const cleanUrl = url => (url ? String(url).split('#')[0] : '');

export const getPageType = (root = getRoot()) => {
  const path = (root.location?.pathname || '').toLowerCase();
  if (path === '/' || path === '') return 'homepage';
  if (path.includes('pricing')) return 'pricing';
  if (path.includes('billing')) return 'billing';
  if (path.includes('checkout')) return 'checkout';
  if (
    path.includes('docs') ||
    path.includes('help') ||
    path.includes('support')
  ) {
    return 'documentation';
  }
  if (path.includes('blog')) return 'blog';
  if (path.includes('integration')) return 'integration';
  if (path.includes('dashboard') || path.includes('account')) {
    return 'dashboard';
  }
  return 'general';
};

export const getChatStartUrl = (root = getRoot()) => {
  const href = root.location?.href || '';
  try {
    const storage = root.sessionStorage;
    if (storage && !storage.getItem(CHAT_START_URL_KEY)) {
      storage.setItem(CHAT_START_URL_KEY, cleanUrl(href));
    }
    return storage ? storage.getItem(CHAT_START_URL_KEY) : cleanUrl(href);
  } catch (_error) {
    return cleanUrl(href);
  }
};

export const collectSmartPageContext = (fields, root = getRoot()) => {
  const attrs = {};

  if (fields.page_title === true) {
    attrs.page_title = root.document?.title || '';
  }
  if (fields.current_page_url === true) {
    attrs.current_page_url = cleanUrl(root.location?.href || '');
  }
  if (fields.last_context_update_at === true) {
    attrs.last_context_update_at = new Date().toISOString();
  }
  if (fields.chat_start_url === true) {
    attrs.chat_start_url = getChatStartUrl(root);
  }
  if (fields.referrer === true) {
    attrs.referrer = cleanUrl(root.document?.referrer || '');
  }
  if (fields.page_type === true) {
    attrs.page_type = getPageType(root);
  }

  return attrs;
};

const getRuntimeScriptSource = script => {
  if (!script) return '';
  return script.getAttribute?.('src') || script.src || '';
};

export const hasLegacyRuntimeScript = (root = getRoot()) => {
  const scripts = root.document?.getElementsByTagName?.('script') || [];
  return Array.from(scripts).some(script => {
    const source = getRuntimeScriptSource(script);
    if (!source) return false;

    try {
      return new URL(source, root.location?.href).pathname === RUNTIME_PATH;
    } catch (_error) {
      return source.split('?')[0].endsWith(RUNTIME_PATH);
    }
  });
};

export const claimSmartPageContextOwnership = (root = getRoot()) => {
  if (
    hasLegacyRuntimeScript(root) ||
    root.VoxeWidgetRuntime ||
    root[SMART_PAGE_CONTEXT_OWNER]
  ) {
    return false;
  }

  root[SMART_PAGE_CONTEXT_OWNER] = SMART_PAGE_CONTEXT_OWNER_SDK;
  return true;
};

const getEnabledFields = config => {
  const smartPageContext =
    config?.smartPageContext || config?.smart_page_context;
  if (
    !smartPageContext ||
    typeof smartPageContext !== 'object' ||
    Array.isArray(smartPageContext) ||
    smartPageContext.enabled !== true ||
    !smartPageContext.fields ||
    typeof smartPageContext.fields !== 'object' ||
    Array.isArray(smartPageContext.fields)
  ) {
    return null;
  }

  const fields = SMART_PAGE_CONTEXT_FIELDS.reduce((result, field) => {
    result[field] = smartPageContext.fields[field] === true;
    return result;
  }, {});

  return Object.values(fields).some(Boolean) ? fields : null;
};

const sendPageContext = (root, fields) => {
  const setCustomAttributes = root.$chatwoot?.setCustomAttributes;
  if (typeof setCustomAttributes !== 'function') return false;

  const attrs = collectSmartPageContext(fields, root);
  if (!Object.keys(attrs).length) return false;

  setCustomAttributes.call(root.$chatwoot, attrs);
  return true;
};

const applySmartPageContext = (root, config) => {
  const fields = getEnabledFields(config);
  if (!fields) return false;

  let sentInitial = false;
  const sendFromReady = () => {
    if (sentInitial) return;
    if (sendPageContext(root, fields)) sentInitial = true;
  };

  root.addEventListener?.('chatwoot:ready', sendFromReady);
  root.addEventListener?.('chatwoot:opened', () => {
    sendPageContext(root, fields);
  });
  if (root.$chatwoot?.hasLoaded) sendFromReady();
  return true;
};

export const initializeSmartPageContext = ({ config, root = getRoot() }) => {
  if (!claimSmartPageContextOwnership(root)) return false;

  applySmartPageContext(root, config);

  return true;
};
