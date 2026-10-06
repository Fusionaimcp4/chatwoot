<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store.js';
import GroupedAvatars from 'widget/components/GroupedAvatars.vue';
import AvailabilityText from './AvailabilityText.vue';
import { useAvailability } from 'widget/composables/useAvailability';

const props = defineProps({
  agents: {
    type: Array,
    default: () => [],
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  showAvatars: {
    type: Boolean,
    default: true,
  },
  textClasses: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();

const availableMessage = useMapGetter('appConfig/getAvailableMessage');
const unavailableMessage = useMapGetter('appConfig/getUnavailableMessage');

const {
  currentTime,
  connectedAgentBot,
  hasAiAvailable,
  hasOnlineHumanAgents,
  hasOnlineAgents,
  isOnline,
  inboxConfig,
  isInWorkingHours,
} = useAvailability(props.agents);

const workingHours = computed(() => inboxConfig.value.workingHours || []);
const workingHoursEnabled = computed(
  () => inboxConfig.value.workingHoursEnabled || false
);
const utcOffset = computed(
  () => inboxConfig.value.utcOffset || inboxConfig.value.timezone || 'UTC'
);
const replyTime = computed(
  () => inboxConfig.value.replyTime || 'in_a_few_seconds'
);

const isAvailable = computed(
  () => isOnline.value || (workingHoursEnabled.value && isInWorkingHours.value)
);

const headerText = computed(() => {
  if (!isAvailable.value) {
    return unavailableMessage.value || t('TEAM_AVAILABILITY.OFFLINE');
  }

  if (hasAiAvailable.value && hasOnlineHumanAgents.value) {
    return t('TEAM_AVAILABILITY.AI_AND_TEAM', {
      name: connectedAgentBot.value.name,
    });
  }

  if (hasAiAvailable.value) {
    return t('TEAM_AVAILABILITY.AI_ONLY', {
      name: connectedAgentBot.value.name,
    });
  }

  return availableMessage.value || t('TEAM_AVAILABILITY.ONLINE');
});
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex flex-col gap-1">
      <div v-if="showHeader" class="font-medium text-n-slate-12">
        {{ headerText }}
      </div>

      <AvailabilityText
        :time="currentTime"
        :utc-offset="utcOffset"
        :working-hours="workingHours"
        :working-hours-enabled="workingHoursEnabled"
        :has-ai-available="hasAiAvailable"
        :reply-time="replyTime"
        :is-online="isOnline"
        :is-in-working-hours="isInWorkingHours"
        :class="textClasses"
        class="text-n-slate-11"
      />
    </div>

    <GroupedAvatars v-if="showAvatars && hasOnlineAgents" :users="agents" />
  </div>
</template>
