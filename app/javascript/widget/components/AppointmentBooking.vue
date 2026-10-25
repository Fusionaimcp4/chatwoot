<script setup>
import { computed, ref, watch } from 'vue';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { getContrastingTextColor } from '@chatwoot/utils';
import {
  BOOK_APPOINTMENT_ACTION,
  DISMISS_CALENDAR_ACTION,
  buildBookSubmittedValues,
  buildDismissSubmittedValues,
  getCalendarDateGroups,
  getLatestCalendarMessageId,
  getSubmittedAction,
  getSubmittedSlotTitle,
  isCalendarMessageInteractive,
  isValidBookingEmail,
} from 'widget/helpers/appointmentBooking';
import { detectVisitorTimezone } from 'widget/helpers/visitorTimezone';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  messageId: { type: [Number, String], required: true },
  messageContent: { type: String, default: '' },
  messageContentAttributes: {
    type: Object,
    default: () => ({}),
  },
});

const store = useStore();
const { t } = useI18n();

const selectedDateKey = ref('');
const selectedSlotValue = ref('');
const email = ref('');
const name = ref('');
const reason = ref('');
const isSubmitting = ref(false);
const hadEmailWhenOpened = ref(false);
const localError = ref('');

const currentUser = useMapGetter('contacts/getCurrentUser');
const widgetColor = useMapGetter('appConfig/getWidgetColor');
const conversations = useMapGetter('conversation/getConversation');
const messageUIFlags = useMapGetter('message/getUIFlags');
const isUpdating = computed(() => Boolean(messageUIFlags.value?.isUpdating));

const textColor = computed(() => getContrastingTextColor(widgetColor.value));

const dateGroups = computed(() =>
  getCalendarDateGroups(props.messageContentAttributes?.items)
);

const timezoneLabel = computed(
  () =>
    props.messageContentAttributes?.timezone ||
    currentUser.value?.custom_attributes?.timezone ||
    detectVisitorTimezone()
);

const selectedDateGroup = computed(
  () =>
    dateGroups.value.find(group => group.key === selectedDateKey.value) ||
    dateGroups.value[0] ||
    null
);

const selectedSlot = computed(() => {
  if (!selectedDateGroup.value) return null;
  return (
    selectedDateGroup.value.slots.find(
      slot => slot.value === selectedSlotValue.value
    ) || null
  );
});

const latestCalendarMessageId = computed(
  () => getLatestCalendarMessageId(conversations.value || {}) || props.messageId
);

const isInteractive = computed(() =>
  isCalendarMessageInteractive({
    messageId: props.messageId,
    messageContentAttributes: props.messageContentAttributes,
    latestCalendarMessageId: latestCalendarMessageId.value,
  })
);

const submittedValues = computed(
  () => props.messageContentAttributes?.submitted_values || []
);

const statusLabel = computed(() => {
  const action = getSubmittedAction(submittedValues.value);
  if (action === BOOK_APPOINTMENT_ACTION) {
    return t('APPOINTMENT_BOOKING.STATUS_SUBMITTED');
  }
  if (action === DISMISS_CALENDAR_ACTION) {
    return t('APPOINTMENT_BOOKING.STATUS_DISMISSED');
  }
  return t('APPOINTMENT_BOOKING.STATUS_SUPERSEDED');
});

const submittedSlotTitle = computed(() =>
  getSubmittedSlotTitle(submittedValues.value)
);

const canConfirm = computed(
  () =>
    isInteractive.value &&
    !isSubmitting.value &&
    !isUpdating.value &&
    Boolean(selectedSlot.value) &&
    isValidBookingEmail(email.value)
);

const prefillFromContact = () => {
  const user = currentUser.value || {};
  const prefill = props.messageContentAttributes?.prefill || {};
  const contactEmail = user.email || prefill.email || '';
  const contactName = user.name || prefill.name || '';

  email.value = contactEmail;
  name.value = contactName;
  hadEmailWhenOpened.value = Boolean(user.has_email || user.email);
};

const ensureDefaultSelection = () => {
  if (!dateGroups.value.length) {
    selectedDateKey.value = '';
    selectedSlotValue.value = '';
    return;
  }

  if (
    !selectedDateKey.value ||
    !dateGroups.value.some(group => group.key === selectedDateKey.value)
  ) {
    selectedDateKey.value = dateGroups.value[0].key;
  }

  const group =
    dateGroups.value.find(item => item.key === selectedDateKey.value) ||
    dateGroups.value[0];

  if (
    !selectedSlotValue.value ||
    !group.slots.some(slot => slot.value === selectedSlotValue.value)
  ) {
    selectedSlotValue.value = group.slots[0]?.value || '';
  }
};

watch(
  dateGroups,
  () => {
    ensureDefaultSelection();
  },
  { immediate: true }
);

watch(
  currentUser,
  () => {
    if (!email.value) {
      prefillFromContact();
    }
  },
  { immediate: true }
);

const selectDate = key => {
  if (!isInteractive.value) return;
  selectedDateKey.value = key;
  const group = dateGroups.value.find(item => item.key === key);
  selectedSlotValue.value = group?.slots?.[0]?.value || '';
  localError.value = '';
};

const selectSlot = value => {
  if (!isInteractive.value) return;
  selectedSlotValue.value = value;
  localError.value = '';
};

const maybeSaveContactEmail = async () => {
  if (hadEmailWhenOpened.value) return;

  try {
    await store.dispatch('contacts/get');
    const user = store.getters['contacts/getCurrentUser'] || {};
    if (user.has_email || user.email) {
      // Email appeared since the form opened — do not overwrite.
      return;
    }

    await store.dispatch('contacts/update', {
      user: { email: email.value.trim() },
    });
  } catch {
    // Booking must not depend on profile write success.
  }
};

const submitValues = async submittedValuesPayload => {
  if (isSubmitting.value || isUpdating.value) return;

  isSubmitting.value = true;
  localError.value = '';
  try {
    await store.dispatch('message/update', {
      messageId: props.messageId,
      submittedValues: submittedValuesPayload,
    });
  } catch {
    localError.value = t('APPOINTMENT_BOOKING.SUBMIT_ERROR');
  } finally {
    isSubmitting.value = false;
  }
};

const onConfirm = async () => {
  if (!canConfirm.value) {
    if (!isValidBookingEmail(email.value)) {
      localError.value = t('APPOINTMENT_BOOKING.EMAIL_REQUIRED');
    }
    return;
  }

  await maybeSaveContactEmail();

  const visitorTimezone =
    currentUser.value?.custom_attributes?.timezone || detectVisitorTimezone();

  await submitValues(
    buildBookSubmittedValues({
      slot: selectedSlot.value,
      email: email.value,
      name: name.value,
      reason: reason.value,
      visitorTimezone,
    })
  );
};

const onDismiss = async () => {
  if (!isInteractive.value || isSubmitting.value || isUpdating.value) return;
  await submitValues(buildDismissSubmittedValues());
};
</script>

<template>
  <div
    class="w-full max-w-full rounded-lg border border-n-weak bg-n-background p-3 dark:bg-n-solid-3"
  >
    <div
      v-if="messageContent"
      class="mb-2 text-sm font-medium leading-5 text-n-slate-12"
    >
      {{ messageContent }}
    </div>

    <div v-if="timezoneLabel" class="mb-3 text-xs text-n-slate-11">
      {{
        $t('APPOINTMENT_BOOKING.TIMEZONE_LABEL', { timezone: timezoneLabel })
      }}
    </div>

    <template v-if="isInteractive">
      <div v-if="!dateGroups.length" class="text-sm text-n-slate-11">
        {{ $t('APPOINTMENT_BOOKING.EMPTY') }}
      </div>

      <template v-else>
        <div
          class="mb-2 text-xs font-medium uppercase tracking-wide text-n-slate-11"
        >
          {{ $t('APPOINTMENT_BOOKING.DATE_LABEL') }}
        </div>
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="group in dateGroups"
            :key="group.key"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity"
            :class="
              selectedDateKey === group.key
                ? 'border-transparent'
                : 'border-n-weak bg-transparent text-n-slate-12 hover:opacity-80'
            "
            :style="
              selectedDateKey === group.key
                ? {
                    backgroundColor: widgetColor,
                    color: textColor,
                    borderColor: widgetColor,
                  }
                : { borderColor: widgetColor, color: widgetColor }
            "
            @click="selectDate(group.key)"
          >
            {{ group.dateLabel }}
          </button>
        </div>

        <div
          class="mb-2 text-xs font-medium uppercase tracking-wide text-n-slate-11"
        >
          {{ $t('APPOINTMENT_BOOKING.TIME_LABEL') }}
        </div>
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="slot in selectedDateGroup?.slots || []"
            :key="slot.value"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity"
            :class="
              selectedSlotValue === slot.value
                ? 'border-transparent'
                : 'border-n-weak bg-transparent text-n-slate-12 hover:opacity-80'
            "
            :style="
              selectedSlotValue === slot.value
                ? {
                    backgroundColor: widgetColor,
                    color: textColor,
                    borderColor: widgetColor,
                  }
                : { borderColor: widgetColor, color: widgetColor }
            "
            @click="selectSlot(slot.value)"
          >
            {{ slot.title }}
          </button>
        </div>

        <div class="mb-2 space-y-2">
          <label class="block">
            <span class="mb-1 block text-xs text-n-slate-11">
              {{ $t('APPOINTMENT_BOOKING.EMAIL_LABEL') }}
            </span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              class="w-full rounded-md border border-n-weak bg-n-background px-3 py-2 text-sm text-n-slate-12 outline-none dark:bg-n-alpha-2"
              :placeholder="$t('APPOINTMENT_BOOKING.EMAIL_PLACEHOLDER')"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-n-slate-11">
              {{ $t('APPOINTMENT_BOOKING.NAME_LABEL') }}
            </span>
            <input
              v-model="name"
              type="text"
              autocomplete="name"
              class="w-full rounded-md border border-n-weak bg-n-background px-3 py-2 text-sm text-n-slate-12 outline-none dark:bg-n-alpha-2"
              :placeholder="$t('APPOINTMENT_BOOKING.NAME_PLACEHOLDER')"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-n-slate-11">
              {{ $t('APPOINTMENT_BOOKING.REASON_LABEL') }}
            </span>
            <textarea
              v-model="reason"
              rows="2"
              class="w-full resize-none rounded-md border border-n-weak bg-n-background px-3 py-2 text-sm text-n-slate-12 outline-none dark:bg-n-alpha-2"
              :placeholder="$t('APPOINTMENT_BOOKING.REASON_PLACEHOLDER')"
            />
          </label>
        </div>

        <p v-if="localError" class="mb-2 text-xs text-n-ruby-11">
          {{ localError }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            :style="{ backgroundColor: widgetColor, color: textColor }"
            :disabled="!canConfirm"
            @click="onConfirm"
          >
            {{
              isSubmitting || isUpdating
                ? $t('APPOINTMENT_BOOKING.SUBMITTING')
                : $t('APPOINTMENT_BOOKING.CONFIRM')
            }}
          </button>
          <button
            type="button"
            class="rounded-md border border-n-weak bg-transparent px-3 py-2 text-sm font-medium text-n-slate-12 disabled:opacity-50"
            :disabled="isSubmitting || isUpdating"
            @click="onDismiss"
          >
            {{ $t('APPOINTMENT_BOOKING.DISMISS') }}
          </button>
        </div>
      </template>
    </template>

    <div v-else class="text-sm text-n-slate-11">
      <p>{{ statusLabel }}</p>
      <p v-if="submittedSlotTitle" class="mt-1 font-medium text-n-slate-12">
        {{ submittedSlotTitle }}
      </p>
    </div>
  </div>
</template>
