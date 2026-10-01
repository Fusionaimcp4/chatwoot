import {
  getSavedWidgetLayoutPreference,
  isValidWidgetLayout,
  resolveWidgetLayoutPreference,
  saveWidgetLayoutPreference,
  widgetLayoutClassName,
  widgetLayoutStorageKey,
} from '../layoutPreference';

describe('layoutPreference', () => {
  const token = 'website-token';
  let storage;

  beforeEach(() => {
    storage = {
      store: {},
      getItem: vi.fn(key => storage.store[key] || null),
      setItem: vi.fn((key, value) => {
        storage.store[key] = value;
      }),
    };
  });

  it('builds a website-token scoped storage key', () => {
    expect(widgetLayoutStorageKey(token)).toBe(
      'cw_widget_layout_website-token'
    );
  });

  it('validates only compact and expanded', () => {
    expect(isValidWidgetLayout('compact')).toBe(true);
    expect(isValidWidgetLayout('expanded')).toBe(true);
    expect(isValidWidgetLayout('legacy')).toBe(false);
    expect(isValidWidgetLayout('')).toBe(false);
  });

  it('uses compact when no preference and no server layout', () => {
    expect(
      resolveWidgetLayoutPreference({
        websiteToken: token,
        serverLayout: undefined,
        storage,
      })
    ).toBe('compact');
  });

  it('uses server expanded when no preference is saved', () => {
    expect(
      resolveWidgetLayoutPreference({
        websiteToken: token,
        serverLayout: 'expanded',
        storage,
      })
    ).toBe('expanded');
  });

  it('lets saved expanded override compact server default', () => {
    saveWidgetLayoutPreference(token, 'expanded', storage);

    expect(
      resolveWidgetLayoutPreference({
        websiteToken: token,
        serverLayout: 'compact',
        storage,
      })
    ).toBe('expanded');
  });

  it('lets saved compact override expanded server default', () => {
    saveWidgetLayoutPreference(token, 'compact', storage);

    expect(
      resolveWidgetLayoutPreference({
        websiteToken: token,
        serverLayout: 'expanded',
        storage,
      })
    ).toBe('compact');
  });

  it('ignores invalid saved preferences', () => {
    storage.store[widgetLayoutStorageKey(token)] = 'fullscreen';

    expect(getSavedWidgetLayoutPreference(token, storage)).toBeNull();
    expect(
      resolveWidgetLayoutPreference({
        websiteToken: token,
        serverLayout: 'expanded',
        storage,
      })
    ).toBe('expanded');
  });

  it('persists preference for the next init/reload', () => {
    saveWidgetLayoutPreference(token, 'expanded', storage);

    expect(
      resolveWidgetLayoutPreference({
        websiteToken: token,
        serverLayout: 'compact',
        storage,
      })
    ).toBe('expanded');
    expect(storage.setItem).toHaveBeenCalledWith(
      'cw_widget_layout_website-token',
      'expanded'
    );
  });

  it('builds holder class names from validated layouts', () => {
    expect(widgetLayoutClassName('compact')).toBe(
      'woot-widget-layout--compact'
    );
    expect(widgetLayoutClassName('expanded')).toBe(
      'woot-widget-layout--expanded'
    );
    expect(widgetLayoutClassName('legacy')).toBe('woot-widget-layout--compact');
  });
});
