export const AGENT_BOT_TYPE = 'agent_bot';

export const buildConnectedAgentBotRecord = bot => {
  if (!bot || !bot.active || !bot.id || !bot.name) {
    return null;
  }

  return {
    id: `agent_bot_${bot.id}`,
    name: bot.name,
    avatar_url: bot.avatarUrl || bot.avatar_url || '',
    availability_status: 'online',
    type: AGENT_BOT_TYPE,
  };
};

export const getConnectedAgentBotFromChannel = (
  channelConfig = window.chatwootWebChannel || {}
) => {
  const bot = channelConfig.connectedAgentBot;
  if (bot && typeof bot === 'object') {
    return buildConnectedAgentBotRecord(bot);
  }

  // Legacy bootstrap: hasAConnectedAgentBot was the bot name string only.
  const legacyName = channelConfig.hasAConnectedAgentBot;
  if (!legacyName) {
    return null;
  }

  return buildConnectedAgentBotRecord({
    id: 'legacy',
    name: legacyName,
    avatarUrl: channelConfig.avatarUrl,
    active: true,
  });
};

export const isAgentBotRecord = agent =>
  agent?.type === AGENT_BOT_TYPE ||
  (typeof agent?.id === 'string' && agent.id.startsWith('agent_bot_'));

export const mergeAvailableAgents = (humanAgents = [], connectedBot = null) => {
  const onlineHumans = (humanAgents || []).filter(
    agent => agent?.availability_status === 'online' && !isAgentBotRecord(agent)
  );

  if (!connectedBot) {
    return onlineHumans;
  }

  return [connectedBot, ...onlineHumans];
};
