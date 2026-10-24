import { sendMessage } from 'widget/helpers/utils';
import { actions, resetEnsureTimezoneInFlight } from '../../contacts';
import ContactsAPI from '../../../../api/contacts';
import * as visitorTimezone from 'widget/helpers/visitorTimezone';

const commit = vi.fn();
const dispatch = vi.fn();

vi.mock('widget/helpers/utils', () => ({
  sendMessage: vi.fn(),
}));
vi.mock('../../../../api/contacts', () => ({
  default: {
    get: vi.fn(),
    update: vi.fn(),
    setUser: vi.fn(),
    setCustomAttributes: vi.fn(),
    deleteCustomAttribute: vi.fn(),
  },
}));

describe('#actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEnsureTimezoneInFlight();
  });

  describe('#setUser', () => {
    it('sends correct actions if contact object is refreshed ', async () => {
      const user = {
        email: 'thoma@sphadikam.com',
        name: 'Adu Thoma',
        avatar_url: '',
      };
      ContactsAPI.setUser.mockResolvedValue({
        data: { widget_auth_token: 'token' },
      });
      await actions.setUser({ commit, dispatch }, { identifier: 1, user });
      expect(sendMessage.mock.calls).toEqual([
        [{ data: { widgetAuthToken: 'token' }, event: 'setAuthCookie' }],
      ]);
      expect(commit.mock.calls).toEqual([]);
      expect(dispatch.mock.calls).toEqual([
        ['get'],
        ['ensureTimezone'],
        ['conversation/clearConversations', {}, { root: true }],
        ['conversation/fetchOldConversations', {}, { root: true }],
        ['conversationAttributes/getAttributes', {}, { root: true }],
      ]);
    });

    it('sends correct actions if identifierHash is passed ', async () => {
      const user = {
        email: 'thoma@sphadikam.com',
        name: 'Adu Thoma',
        avatar_url: '',
        identifier_hash: '12345',
      };
      ContactsAPI.setUser.mockResolvedValue({ data: { id: 1 } });
      await actions.setUser({ commit, dispatch }, { identifier: 1, user });
      expect(sendMessage.mock.calls).toEqual([]);
      expect(commit.mock.calls).toEqual([]);
      expect(dispatch.mock.calls).toEqual([
        ['get'],
        ['ensureTimezone'],
        ['conversation/clearConversations', {}, { root: true }],
        ['conversation/fetchOldConversations', {}, { root: true }],
        ['conversationAttributes/getAttributes', {}, { root: true }],
      ]);
    });

    it('does not call sendMessage if contact object is not refreshed ', async () => {
      const user = {
        email: 'thoma@sphadikam.com',
        name: 'Adu Thoma',
        avatar_url: '',
      };
      ContactsAPI.setUser.mockResolvedValue({ data: { id: 1 } });
      await actions.setUser({ commit, dispatch }, { identifier: 1, user });
      expect(sendMessage.mock.calls).toEqual([]);
      expect(commit.mock.calls).toEqual([]);
      expect(dispatch.mock.calls).toEqual([['get'], ['ensureTimezone']]);
    });
  });

  describe('#update', () => {
    it('sends correct actions', async () => {
      const user = {
        email: 'thoma@sphadikam.com',
        name: 'Adu Thoma',
        avatar_url: '',
        identifier_hash: 'random_hex_identifier_hash',
      };
      ContactsAPI.update.mockResolvedValue({ data: { id: 1 } });
      await actions.update({ commit, dispatch }, { identifier: 1, user });
      expect(commit.mock.calls).toEqual([]);
      expect(dispatch.mock.calls).toEqual([['get']]);
    });
  });

  describe('#ensureTimezone', () => {
    it('PATCHes timezone when missing on the contact', async () => {
      vi.spyOn(visitorTimezone, 'detectVisitorTimezone').mockReturnValue(
        'America/Chicago'
      );
      const state = {
        currentUser: {
          id: 1,
          custom_attributes: { plan: 'pro' },
        },
      };
      dispatch.mockImplementation(async (type, payload) => {
        if (type === 'setCustomAttributes') {
          return actions.setCustomAttributes({ commit, state }, payload);
        }
        return undefined;
      });
      ContactsAPI.setCustomAttributes.mockResolvedValue({ data: {} });

      const result = await actions.ensureTimezone({ state, dispatch, commit });

      expect(result).toEqual('America/Chicago');
      expect(ContactsAPI.setCustomAttributes).toHaveBeenCalledWith({
        timezone: 'America/Chicago',
      });
      expect(ContactsAPI.setCustomAttributes).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledWith('SET_CURRENT_USER', {
        custom_attributes: {
          plan: 'pro',
          timezone: 'America/Chicago',
        },
      });
    });

    it('skips PATCH when timezone is already saved', async () => {
      vi.spyOn(visitorTimezone, 'detectVisitorTimezone').mockReturnValue(
        'America/Chicago'
      );
      const state = {
        currentUser: {
          id: 1,
          custom_attributes: { timezone: 'America/Chicago', plan: 'pro' },
        },
      };

      const result = await actions.ensureTimezone({ state, dispatch, commit });

      expect(result).toEqual('America/Chicago');
      expect(dispatch).not.toHaveBeenCalledWith('setCustomAttributes', {
        timezone: 'America/Chicago',
      });
      expect(ContactsAPI.setCustomAttributes).not.toHaveBeenCalled();
    });

    it('does not block when PATCH fails', async () => {
      vi.spyOn(visitorTimezone, 'detectVisitorTimezone').mockReturnValue(
        'Europe/London'
      );
      const state = {
        currentUser: { id: 1, custom_attributes: {} },
      };
      dispatch.mockImplementation(async type => {
        if (type === 'setCustomAttributes') {
          return false;
        }
        return undefined;
      });

      const result = await actions.ensureTimezone({ state, dispatch, commit });

      expect(result).toEqual(null);
      expect(dispatch).toHaveBeenCalledWith('setCustomAttributes', {
        timezone: 'Europe/London',
      });
    });
  });
});
