import { computed, toRef } from 'vue';
import {
  isOnline as checkIsOnline,
  isInWorkingHours as checkInWorkingHours,
} from 'widget/helpers/availabilityHelpers';
import {
  getConnectedAgentBotFromChannel,
  isAgentBotRecord,
} from 'widget/helpers/connectedAgentBot';
import { useCamelCase } from 'dashboard/composables/useTransformKeys';

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_REPLY_TIME = 'in_a_few_seconds';

/**
 * Composable for availability-related logic
 * @param {Ref|Array} agents - Available agents (can be ref or raw array)
 * @returns {Object} Availability utilities and computed properties
 */
export function useAvailability(agents = []) {
  const availableAgents = toRef(agents);

  const channelConfig = computed(() => window.chatwootWebChannel || {});

  const inboxConfig = computed(() => ({
    workingHours: channelConfig.value.workingHours?.map(useCamelCase) || [],
    workingHoursEnabled: channelConfig.value.workingHoursEnabled || false,
    timezone: channelConfig.value.timezone || DEFAULT_TIMEZONE,
    utcOffset:
      channelConfig.value.utcOffset ||
      channelConfig.value.timezone ||
      DEFAULT_TIMEZONE,
    replyTime: channelConfig.value.replyTime || DEFAULT_REPLY_TIME,
  }));

  const currentTime = computed(() => new Date());

  const connectedAgentBot = computed(() => {
    const fromList = (availableAgents.value || []).find(isAgentBotRecord);
    return fromList || getConnectedAgentBotFromChannel(channelConfig.value);
  });

  const hasAiAvailable = computed(() => !!connectedAgentBot.value);

  const hasOnlineHumanAgents = computed(() => {
    const agentList = availableAgents.value || [];
    return Array.isArray(agentList)
      ? agentList.some(
          agent =>
            !isAgentBotRecord(agent) && agent.availability_status === 'online'
        )
      : false;
  });

  const hasOnlineAgents = computed(
    () => hasAiAvailable.value || hasOnlineHumanAgents.value
  );

  const isInWorkingHours = computed(() =>
    checkInWorkingHours(
      currentTime.value,
      inboxConfig.value.utcOffset,
      inboxConfig.value.workingHours
    )
  );

  const isOnline = computed(() =>
    checkIsOnline(
      inboxConfig.value.workingHoursEnabled,
      currentTime.value,
      inboxConfig.value.utcOffset,
      inboxConfig.value.workingHours,
      hasOnlineHumanAgents.value,
      hasAiAvailable.value
    )
  );

  return {
    channelConfig,
    inboxConfig,

    currentTime,
    availableAgents,
    connectedAgentBot,
    hasAiAvailable,
    hasOnlineHumanAgents,
    hasOnlineAgents,

    isOnline,
    isInWorkingHours,
  };
}
