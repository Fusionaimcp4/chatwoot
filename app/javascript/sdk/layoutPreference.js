import { WIDGET_LAYOUT } from './constants';
import { getWidgetLayout } from './settingsHelper';

export const widgetLayoutStorageKey = websiteToken =>
  `cw_widget_layout_${websiteToken}`;

export const isValidWidgetLayout = layout => WIDGET_LAYOUT.includes(layout);

export const getSavedWidgetLayoutPreference = (
  websiteToken,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) => {
  if (!websiteToken || !storage?.getItem) return null;

  try {
    const value = storage.getItem(widgetLayoutStorageKey(websiteToken));
    return isValidWidgetLayout(value) ? value : null;
  } catch (_error) {
    return null;
  }
};

export const saveWidgetLayoutPreference = (
  websiteToken,
  layout,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) => {
  if (!websiteToken || !isValidWidgetLayout(layout) || !storage?.setItem) {
    return false;
  }

  try {
    storage.setItem(widgetLayoutStorageKey(websiteToken), layout);
    return true;
  } catch (_error) {
    return false;
  }
};

export const resolveWidgetLayoutPreference = ({
  websiteToken,
  serverLayout,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
} = {}) => {
  const saved = getSavedWidgetLayoutPreference(websiteToken, storage);
  if (saved) return saved;
  return getWidgetLayout(serverLayout);
};

export const widgetLayoutClassName = layout =>
  `woot-widget-layout--${getWidgetLayout(layout)}`;
