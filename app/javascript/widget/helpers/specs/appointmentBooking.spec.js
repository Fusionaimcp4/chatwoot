import {
  BOOK_APPOINTMENT_ACTION,
  DISMISS_CALENDAR_ACTION,
  buildBookSubmittedValues,
  buildDismissSubmittedValues,
  getCalendarDateGroups,
  getLatestCalendarMessageId,
  isCalendarMessageInteractive,
  isValidBookingEmail,
} from '../appointmentBooking';

describe('appointmentBooking helpers', () => {
  const items = [
    {
      date: '2026-10-26',
      date_label: 'Mon, Oct 26',
      slots: [
        {
          title: '3:30 AM',
          value:
            'booking:calendar_slot:2026-10-26T08:30:00.000Z|2026-10-26T08:45:00.000Z',
        },
        {
          title: '4:00 AM',
          value:
            'booking:calendar_slot:2026-10-26T09:00:00.000Z|2026-10-26T09:15:00.000Z',
        },
      ],
    },
  ];

  it('normalizes date groups without changing slot values', () => {
    const groups = getCalendarDateGroups(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].dateLabel).toEqual('Mon, Oct 26');
    expect(groups[0].slots[0].value).toEqual(
      'booking:calendar_slot:2026-10-26T08:30:00.000Z|2026-10-26T08:45:00.000Z'
    );
  });

  it('builds a flat booking submitted_values payload', () => {
    const values = buildBookSubmittedValues({
      slot: items[0].slots[0],
      email: ' customer@example.com ',
      name: 'Ada',
      reason: 'Demo',
      visitorTimezone: 'America/Chicago',
    });

    expect(values).toEqual([
      {
        name: 'action',
        title: 'Confirm Appointment',
        value: BOOK_APPOINTMENT_ACTION,
      },
      {
        name: 'slot',
        title: '3:30 AM',
        value:
          'booking:calendar_slot:2026-10-26T08:30:00.000Z|2026-10-26T08:45:00.000Z',
      },
      { name: 'email', title: 'Email', value: 'customer@example.com' },
      { name: 'name', title: 'Name', value: 'Ada' },
      { name: 'reason', title: 'Reason', value: 'Demo' },
      {
        name: 'visitor_timezone',
        title: 'Timezone',
        value: 'America/Chicago',
      },
    ]);
  });

  it('builds dismiss submitted_values', () => {
    expect(buildDismissSubmittedValues()).toEqual([
      {
        name: 'action',
        title: 'Dismissed',
        value: DISMISS_CALENDAR_ACTION,
      },
    ]);
  });

  it('validates email addresses', () => {
    expect(isValidBookingEmail('a@b.com')).toEqual(true);
    expect(isValidBookingEmail('bad')).toEqual(false);
  });

  it('picks the latest calendar message id', () => {
    const conversations = {
      10: { id: 10, content_type: 'input_calendar', created_at: 100 },
      11: { id: 11, content_type: 'text', created_at: 200 },
      12: { id: 12, content_type: 'input_calendar', created_at: 150 },
    };
    expect(getLatestCalendarMessageId(conversations)).toEqual(12);
  });

  it('marks older calendars non-interactive when a newer one exists', () => {
    expect(
      isCalendarMessageInteractive({
        messageId: 10,
        messageContentAttributes: {},
        latestCalendarMessageId: 12,
      })
    ).toEqual(false);

    expect(
      isCalendarMessageInteractive({
        messageId: 12,
        messageContentAttributes: {},
        latestCalendarMessageId: 12,
      })
    ).toEqual(true);
  });

  it('marks submitted and dismissed calendars non-interactive', () => {
    expect(
      isCalendarMessageInteractive({
        messageId: 12,
        messageContentAttributes: {
          submitted_values: [
            { name: 'action', value: BOOK_APPOINTMENT_ACTION },
          ],
        },
        latestCalendarMessageId: 12,
      })
    ).toEqual(false);

    expect(
      isCalendarMessageInteractive({
        messageId: 12,
        messageContentAttributes: {
          submitted_values: [
            { name: 'action', value: DISMISS_CALENDAR_ACTION },
          ],
        },
        latestCalendarMessageId: 12,
      })
    ).toEqual(false);
  });
});
