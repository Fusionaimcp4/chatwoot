export const BOOK_APPOINTMENT_ACTION = 'book_appointment';
export const DISMISS_CALENDAR_ACTION = 'dismiss_calendar';
export const CALENDAR_CONTENT_TYPE = 'input_calendar';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize calendar date groups from content_attributes.items.
 * Displays titles/labels exactly as provided by n8n.
 */
export const getCalendarDateGroups = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const slots = Array.isArray(item?.slots) ? item.slots : [];
      return {
        key: item?.date || item?.date_label || `date-${index}`,
        date: item?.date || '',
        dateLabel: item?.date_label || item?.date || '',
        slots: slots
          .filter(slot => slot?.title && slot?.value)
          .map(slot => ({
            title: slot.title,
            value: slot.value,
          })),
      };
    })
    .filter(group => group.slots.length > 0);
};

export const isValidBookingEmail = email =>
  typeof email === 'string' && EMAIL_PATTERN.test(email.trim());

export const getSubmittedAction = (submittedValues = []) => {
  if (!Array.isArray(submittedValues)) return null;
  const actionEntry = submittedValues.find(entry => entry?.name === 'action');
  return actionEntry?.value || null;
};

export const isCalendarMessageTerminal = (messageContentAttributes = {}) => {
  const action = getSubmittedAction(
    messageContentAttributes.submitted_values || []
  );
  return (
    action === BOOK_APPOINTMENT_ACTION || action === DISMISS_CALENDAR_ACTION
  );
};

/**
 * Latest input_calendar message id in the conversation map.
 * Older calendars are non-interactive when a newer one exists.
 */
export const getLatestCalendarMessageId = (conversations = {}) => {
  const calendarMessages = Object.values(conversations).filter(
    message => message?.content_type === CALENDAR_CONTENT_TYPE
  );

  if (!calendarMessages.length) return null;

  return calendarMessages.reduce((latest, message) => {
    if (!latest) return message;
    const latestCreated = Number(latest.created_at) || 0;
    const messageCreated = Number(message.created_at) || 0;
    if (messageCreated > latestCreated) return message;
    if (messageCreated === latestCreated && message.id > latest.id) {
      return message;
    }
    return latest;
  }, null)?.id;
};

export const isCalendarMessageInteractive = ({
  messageId,
  messageContentAttributes,
  latestCalendarMessageId,
}) => {
  if (isCalendarMessageTerminal(messageContentAttributes)) return false;
  if (latestCalendarMessageId == null) return true;
  return Number(messageId) === Number(latestCalendarMessageId);
};

export const buildBookSubmittedValues = ({
  slot,
  email,
  name,
  reason,
  visitorTimezone,
}) => {
  const values = [
    {
      name: 'action',
      title: 'Confirm Appointment',
      value: BOOK_APPOINTMENT_ACTION,
    },
    {
      name: 'slot',
      title: slot.title,
      value: slot.value,
    },
    {
      name: 'email',
      title: 'Email',
      value: email.trim(),
    },
  ];

  if (name && name.trim()) {
    values.push({
      name: 'name',
      title: 'Name',
      value: name.trim(),
    });
  }

  if (reason && reason.trim()) {
    values.push({
      name: 'reason',
      title: 'Reason',
      value: reason.trim(),
    });
  }

  if (visitorTimezone) {
    values.push({
      name: 'visitor_timezone',
      title: 'Timezone',
      value: visitorTimezone,
    });
  }

  return values;
};

export const buildDismissSubmittedValues = () => [
  {
    name: 'action',
    title: 'Dismissed',
    value: DISMISS_CALENDAR_ACTION,
  },
];

export const getCalendarStatusLabelKey = (submittedValues = []) => {
  const action = getSubmittedAction(submittedValues);
  if (action === BOOK_APPOINTMENT_ACTION) {
    return 'APPOINTMENT_BOOKING.STATUS_SUBMITTED';
  }
  if (action === DISMISS_CALENDAR_ACTION) {
    return 'APPOINTMENT_BOOKING.STATUS_DISMISSED';
  }
  return 'APPOINTMENT_BOOKING.STATUS_SUPERSEDED';
};

export const getSubmittedSlotTitle = (submittedValues = []) => {
  if (!Array.isArray(submittedValues)) return '';
  const slot = submittedValues.find(entry => entry?.name === 'slot');
  return slot?.title || '';
};
