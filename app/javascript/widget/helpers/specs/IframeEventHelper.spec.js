import { loadedEventConfig } from '../IframeEventHelper';

describe('IframeEventHelper', () => {
  it('carries WebWidget settings, including SPC, through the loaded event', () => {
    const widgetSettings = {
      layout: 'expanded',
      smart_page_context: {
        enabled: true,
        fields: { page_title: true },
      },
    };
    window.authToken = 'auth-token';
    window.chatwootWebChannel = { widgetSettings };

    expect(loadedEventConfig()).toEqual({
      event: 'loaded',
      config: {
        authToken: 'auth-token',
        channelConfig: { widgetSettings },
      },
    });
  });
});
