import {
  collectSmartPageContext,
  fetchSmartPageContextConfig,
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
  version: 1,
  smartPageContext: {
    enabled: true,
    fields,
  },
});

const waitForAsyncWork = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Smart Page Context SDK', () => {
  it('does not collect or send when disabled', () => {
    const root = createRoot();
    root.document = undefined;

    expect(
      collectSmartPageContext({ page_title: false, referrer: false }, root)
    ).toEqual({});
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

  it('uses the direct Voxe config endpoint and fail-safely handles fetch failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'));
    const root = createRoot({ fetch: fetchFn });

    initializeSmartPageContext({
      websiteToken: 'website-token',
      baseUrl: 'https://chat.voxedesk.com/',
      voxeBaseUrl: 'https://oldvoxe.mcp4.ai/',
      root,
    });
    await waitForAsyncWork();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://oldvoxe.mcp4.ai/api/widget/runtime-config?website_token=website-token&base_url=https%3A%2F%2Fchat.voxedesk.com',
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
      })
    );
    expect(root.$chatwoot.setCustomAttributes).not.toHaveBeenCalled();
  });

  it('does not send malformed configuration', async () => {
    const root = createRoot({
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ smartPageContext: { enabled: true } }),
      }),
    });

    initializeSmartPageContext({
      websiteToken: 'website-token',
      baseUrl: 'https://chat.voxedesk.com',
      voxeBaseUrl: 'https://voxedesk.com',
      root,
    });
    await waitForAsyncWork();

    expect(root.$chatwoot.setCustomAttributes).not.toHaveBeenCalled();
  });

  it('does not collect or send when the configuration disables SPC', async () => {
    const root = createRoot({
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            enabledConfig({ page_title: false, current_page_url: false })
          ),
      }),
    });
    root.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          version: 1,
          smartPageContext: {
            enabled: false,
            fields: { page_title: true },
          },
        }),
    });

    initializeSmartPageContext({
      websiteToken: 'website-token',
      baseUrl: 'https://chat.voxedesk.com',
      voxeBaseUrl: 'https://voxedesk.com',
      root,
    });
    await waitForAsyncWork();

    expect(root.$chatwoot.setCustomAttributes).not.toHaveBeenCalled();
  });

  it('abstains when a legacy runtime script is present', () => {
    const legacyScript = {
      getAttribute: () => 'https://oldvoxe.mcp4.ai/widget/runtime.js?v=1',
    };
    const root = createRoot({ scripts: [legacyScript] });

    expect(hasLegacyRuntimeScript(root)).toBe(true);
    expect(
      initializeSmartPageContext({
        websiteToken: 'website-token',
        baseUrl: 'https://chat.voxedesk.com',
        voxeBaseUrl: 'https://voxedesk.com',
        root,
      })
    ).toBe(false);
    expect(root.fetch).not.toHaveBeenCalled();
  });

  it('abstains when runtime ownership is already claimed', () => {
    const root = createRoot();
    root.__voxeSmartPageContextOwner = 'runtime';

    expect(
      initializeSmartPageContext({
        websiteToken: 'website-token',
        baseUrl: 'https://chat.voxedesk.com',
        voxeBaseUrl: 'https://voxedesk.com',
        root,
      })
    ).toBe(false);
    expect(root.fetch).not.toHaveBeenCalled();
  });

  it('claims ownership and sends contact attributes on ready and opened', async () => {
    const root = createRoot({
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            enabledConfig({ page_title: true, page_type: true })
          ),
      }),
    });

    expect(
      initializeSmartPageContext({
        websiteToken: 'website-token',
        baseUrl: 'https://chat.voxedesk.com',
        voxeBaseUrl: 'https://voxedesk.com',
        root,
      })
    ).toBe(true);
    expect(root.__voxeSmartPageContextOwner).toBe('sdk');
    await waitForAsyncWork();

    expect(root.$chatwoot.setCustomAttributes).not.toHaveBeenCalled();
    root.$chatwoot.hasLoaded = true;
    root.dispatch('chatwoot:ready');
    root.dispatch('chatwoot:opened');

    expect(root.$chatwoot.setCustomAttributes).toHaveBeenCalledTimes(2);
    expect(root.$chatwoot.setConversationCustomAttributes).toBeUndefined();
    expect(root.$chatwoot.setCustomAttributes).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page_title: 'Pricing', page_type: 'pricing' })
    );
  });

  it('uses production Voxe for production SDK configuration', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn(),
    });

    await fetchSmartPageContextConfig({
      websiteToken: 'production-token',
      baseUrl: 'https://chat.voxedesk.com',
      voxeBaseUrl: 'https://voxedesk.com',
      fetch: fetchFn,
      root: createRoot({ fetch: fetchFn }),
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://voxedesk.com/api/widget/runtime-config?website_token=production-token&base_url=https%3A%2F%2Fchat.voxedesk.com',
      expect.any(Object)
    );
  });
});
