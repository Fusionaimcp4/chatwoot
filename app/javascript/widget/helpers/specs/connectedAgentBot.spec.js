import { describe, expect, it, afterEach } from 'vitest';
import {
  buildConnectedAgentBotRecord,
  getConnectedAgentBotFromChannel,
  isAgentBotRecord,
  mergeAvailableAgents,
} from '../connectedAgentBot';

describe('connectedAgentBot helpers', () => {
  const originalChannel = window.chatwootWebChannel;

  afterEach(() => {
    window.chatwootWebChannel = originalChannel;
  });

  it('builds a collision-safe online agent_bot record', () => {
    const record = buildConnectedAgentBotRecord({
      id: 42,
      name: 'Voxe AI',
      avatarUrl: 'https://example.com/bot.png',
      active: true,
    });

    expect(record).toEqual({
      id: 'agent_bot_42',
      name: 'Voxe AI',
      avatar_url: 'https://example.com/bot.png',
      availability_status: 'online',
      type: 'agent_bot',
    });
  });

  it('reads connectedAgentBot from bootstrap', () => {
    window.chatwootWebChannel = {
      connectedAgentBot: {
        id: 7,
        name: 'Shop Assistant',
        avatarUrl: '/bot.png',
        active: true,
      },
    };

    expect(getConnectedAgentBotFromChannel()).toMatchObject({
      id: 'agent_bot_7',
      name: 'Shop Assistant',
    });
  });

  it('merges AI first, then online humans', () => {
    const bot = buildConnectedAgentBotRecord({
      id: 1,
      name: 'Voxe AI',
      active: true,
    });
    const humans = [
      { id: 2, name: 'Sarah', availability_status: 'online' },
      { id: 3, name: 'Tom', availability_status: 'offline' },
    ];

    expect(mergeAvailableAgents(humans, bot).map(a => a.name)).toEqual([
      'Voxe AI',
      'Sarah',
    ]);
  });

  it('identifies agent_bot records', () => {
    expect(isAgentBotRecord({ type: 'agent_bot', id: 'agent_bot_1' })).toBe(
      true
    );
    expect(isAgentBotRecord({ id: 1, type: 'user' })).toBe(false);
  });
});
