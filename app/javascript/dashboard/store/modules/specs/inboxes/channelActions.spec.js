import { buildInboxData } from '../../inboxes/channelActions';

describe('#buildInboxData', () => {
  it('serializes widget layout settings as nested channel parameters', () => {
    const formData = buildInboxData({
      channel: {
        widget_settings: { layout: 'compact' },
      },
    });

    expect(formData.get('channel[widget_settings][layout]')).toBe('compact');
  });
});
