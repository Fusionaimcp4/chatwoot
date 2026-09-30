import {
  collectSmartPageContext,
  getChatStartUrl,
  getPageType,
  hasLegacyRuntimeScript,
  initializeSmartPageContext,
} from '../smartPageContext';

const createStorage = (values = {}) => ({
  getItem: vi.fn(key => values[key] || null),
  setItem: vi.fn((key, value) => {
    values[key] = value;
  }),
});

const createRoot = ({
  href = 'https://merchant.example/pricing?plan=team#details',
  pathname = '/pricing',
  title = 'Pricing',
  referrer = 'https://search.example/results#fragment',
  fetch: fetchFn = vi.fn(),
  scripts = [],
  hasLoaded = false,
} = {}) => {
  const listeners = {};
  const root = {
    location: { href, pathname },
    document: {
      title,
      referrer,
      getElementsByTagName: () => scripts,
    },
    sessionStorage: createStorage(),
    fetch: fetchFn,
    $chatwoot: {
      hasLoaded,
      setCustomAttributes: vi.fn(),
    },
    addEventListener: vi.fn((event, callback) => {
      listeners[event] = callback;
    }),
  };

  root.dispatch = event => listeners[event]?.();
  return root;
};

const enabledConfig = fields => ({
  smartPageContext: {
    enabled: true,
    fields,
  },
});

describe('Smart Page Context SDK', () => {
  it('does not collect or send when disabled', () => {
    const root = createRoot();
    const config = {
      smartPageContext: {
        enabled: false,
        fields: { page_title: true },
      },
    };

    initializeSmartPageContext({ config, root });

    expect(root.$chatwoot.setCustomAttributes).not.toHaveBeenCalled();
    expect(root.fetch).not.toHaveBeenCalled();
  });

  it('collects exactly the six enabled fields', () => {
    const root = createRoot();
    const fields = {
      page_title: true,
      current_page_url: true,
      last_context_update_at: true,
      chat_start_url: true,
      referrer: true,
      page_type: true,
    };

    const attrs = collectSmartPageContext(fields, root);

    expect(Object.keys(attrs)).toEqual([
      'page_title',
      'current_page_url',
      'last_context_update_at',
      'chat_start_url',
      'referrer',
      'page_type',
    ]);
    expect(attrs).toMatchObject({
      page_title: 'Pricing',
      current_page_url: 'https://merchant.example/pricing?plan=team',
      chat_start_url: 'https://merchant.example/pricing?plan=team',
      referrer: 'https://search.example/results',
      page_type: 'pricing',
    });
    expect(new Date(attrs.last_context_update_at).toString()).not.toBe(
      'Invalid Date'
    );
  });

  it('does not read or send disabled fields', () => {
    const root = createRoot();
    root.location = undefined;

    expect(collectSmartPageContext({ page_title: true }, root)).toEqual({
      page_title: 'Pricing',
    });
  });

  it('preserves the first cleaned chat start URL in sessionStorage', () => {
    const root = createRoot();

    expect(getChatStartUrl(root)).toBe(
      'https://merchant.example/pricing?plan=team'
    );
    root.location.href = 'https://merchant.example/checkout#payment';
    root.location.pathname = '/checkout';
    expect(getChatStartUrl(root)).toBe(
      'https://merchant.example/pricing?plan=team'
    );
  });

  it.each([
    ['/', 'homepage'],
    ['/billing/invoices', 'billing'],
    ['/checkout', 'checkout'],
    ['/help/getting-started', 'documentation'],
    ['/blog/article', 'blog'],
    ['/integrations/slack', 'integration'],
    ['/account/settings', 'dashboard'],
    ['/features', 'general'],
  ])('classifies %s as %s', (pathname, expected) => {
    expect(getPageType(createRoot({ pathname }))).toBe(expected);
  });

  it('consumes configuration supplied by Chatwoot without a Voxe request', () => {
    const root = createRoot({ hasLoaded: true });

    initializeSmartPageContext({
      config: enabledConfig({ page_title: true, page_type: true }),
      root,
    });

    expect(root.fetch).not.toHaveBeenCalled();
    expect(root.$chatwoot.setCustomAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ page_title: 'Pricing', page_type: 'pricing' })
    );
  });

  it('waits for ready, then refreshes context when the widget opens', () => {
    const root = createRoot();

    initializeSmartPageContext({
      config: enabledConfig({ page_title: true, page_type: true }),
      root,
    });

    expect(root.$chatwoot.setCustomAttributes).not.toHaveBeenCalled();
    root.$chatwoot.hasLoaded = true;
    root.dispatch('chatwoot:ready');
    root.dispatch('chatwoot:opened');

    expect(root.$chatwoot.setCustomAttributes).toHaveBeenCalledTimes(2);
    expect(root.$chatwoot.setCustomAttributes).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page_title: 'Pricing', page_type: 'pricing' })
    );
  });

  it('accepts the snake_case widget-settings key', () => {
    const root = createRoot({ hasLoaded: true });

    initializeSmartPageContext({
      config: {
        smart_page_context: {
          enabled: true,
          fields: { current_page_url: true },
        },
      },
      root,
    });

    expect(root.$chatwoot.setCustomAttributes).toHaveBeenCalledWith({
      current_page_url: 'https://merchant.example/pricing?plan=team',
    });
  });

  it('abstains when a legacy runtime script is present', () => {
    const legacyScript = {
      getAttribute: () => 'https://oldvoxe.mcp4.ai/widget/runtime.js?v=1',
    };
    const root = createRoot({ scripts: [legacyScript] });

    expect(hasLegacyRuntimeScript(root)).toBe(true);
    expect(
      initializeSmartPageContext({
        config: enabledConfig({ page_title: true }),
        root,
      })
    ).toBe(false);
    expect(root.fetch).not.toHaveBeenCalled();
  });

  it('abstains when runtime ownership is already claimed', () => {
    const root = createRoot();
    Object.defineProperty(root, '__voxeSmartPageContextOwner', {
      configurable: true,
      value: 'runtime',
      writable: true,
    });

    expect(
      initializeSmartPageContext({
        config: enabledConfig({ page_title: true }),
        root,
      })
    ).toBe(false);
    expect(root.fetch).not.toHaveBeenCalled();
  });
});
