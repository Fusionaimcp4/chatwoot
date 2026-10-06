import { getters } from '../../agent';
import { agents } from './data';

describe('#getters', () => {
  const originalChannel = window.chatwootWebChannel;

  afterEach(() => {
    window.chatwootWebChannel = originalChannel;
  });

  it('availableAgents', () => {
    window.chatwootWebChannel = {};
    const state = {
      records: agents,
    };
    expect(getters.availableAgents(state)).toEqual([
      {
        id: 1,
        name: 'John',
        avatar_url: '',
        availability_status: 'online',
      },
      {
        id: 3,
        name: 'Pranav',
        avatar_url: '',
        availability_status: 'online',
      },
      {
        id: 4,
        name: 'Nithin',
        avatar_url: '',
        availability_status: 'online',
      },
    ]);
  });

  it('prepends connected AgentBot before online humans', () => {
    window.chatwootWebChannel = {
      connectedAgentBot: {
        id: 99,
        name: 'Voxe AI',
        avatarUrl: '/bot.png',
        active: true,
      },
    };
    const state = {
      records: agents,
    };
    const available = getters.availableAgents(state);
    expect(available[0]).toMatchObject({
      id: 'agent_bot_99',
      name: 'Voxe AI',
      type: 'agent_bot',
    });
    expect(available).toHaveLength(4);
  });
});
