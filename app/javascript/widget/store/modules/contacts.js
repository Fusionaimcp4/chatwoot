import { sendMessage } from 'widget/helpers/utils';
import ContactsAPI from '../../api/contacts';
import { SET_USER_ERROR } from '../../constants/errorTypes';
import { setHeader } from '../../helpers/axios';
import {
  detectVisitorTimezone,
  shouldUpdateVisitorTimezone,
} from 'widget/helpers/visitorTimezone';

const state = {
  currentUser: {},
};

const SET_CURRENT_USER = 'SET_CURRENT_USER';

/** Shared in-flight promise so concurrent callers share one PATCH. */
let ensureTimezoneInFlight = null;

/** @internal Reset in-flight guard between unit tests. */
export const resetEnsureTimezoneInFlight = () => {
  ensureTimezoneInFlight = null;
};

const parseErrorData = error =>
  error && error.response && error.response.data ? error.response.data : error;
export const updateWidgetAuthToken = widgetAuthToken => {
  if (widgetAuthToken) {
    setHeader(widgetAuthToken);
    sendMessage({
      event: 'setAuthCookie',
      data: { widgetAuthToken },
    });
  }
};

export const getters = {
  getCurrentUser(_state) {
    return _state.currentUser;
  },
};

export const actions = {
  get: async ({ commit }) => {
    try {
      const { data } = await ContactsAPI.get();
      commit(SET_CURRENT_USER, data);
    } catch (error) {
      // Ignore error
    }
  },
  update: async ({ dispatch }, { user }) => {
    try {
      await ContactsAPI.update(user);
      dispatch('get');
    } catch (error) {
      // Ignore error
    }
  },
  setUser: async ({ dispatch }, { identifier, user: userObject }) => {
    try {
      const {
        email,
        name,
        avatar_url,
        identifier_hash: identifierHash,
        phone_number,
        company_name,
        city,
        country_code,
        description,
        custom_attributes,
        social_profiles,
      } = userObject;
      const user = {
        email,
        name,
        avatar_url,
        identifier_hash: identifierHash,
        phone_number,
        additional_attributes: {
          company_name,
          city,
          description,
          country_code,
          social_profiles,
        },
        custom_attributes,
      };
      const {
        data: { widget_auth_token: widgetAuthToken },
      } = await ContactsAPI.setUser(identifier, user);
      updateWidgetAuthToken(widgetAuthToken);
      await dispatch('get');
      await dispatch('ensureTimezone');
      if (identifierHash || widgetAuthToken) {
        dispatch('conversation/clearConversations', {}, { root: true });
        dispatch('conversation/fetchOldConversations', {}, { root: true });
        dispatch('conversationAttributes/getAttributes', {}, { root: true });
      }
    } catch (error) {
      const data = parseErrorData(error);
      sendMessage({ event: 'error', errorType: SET_USER_ERROR, data });
    }
  },
  setCustomAttributes: async (
    { commit, state: contactState },
    customAttributes = {}
  ) => {
    try {
      await ContactsAPI.setCustomAttributes(customAttributes);
      commit(SET_CURRENT_USER, {
        custom_attributes: {
          ...(contactState.currentUser.custom_attributes || {}),
          ...customAttributes,
        },
      });
      return true;
    } catch (error) {
      // Ignore error — messaging must not depend on metadata writes
      return false;
    }
  },
  /**
   * Detect visitor IANA timezone and persist to contact.custom_attributes.timezone
   * once per change. Safe to call repeatedly; skips PATCH when unchanged.
   */
  ensureTimezone: ({ state: contactState, dispatch }) => {
    if (ensureTimezoneInFlight) {
      return ensureTimezoneInFlight;
    }

    ensureTimezoneInFlight = (async () => {
      try {
        if (
          !contactState.currentUser ||
          !Object.keys(contactState.currentUser).length
        ) {
          await dispatch('get');
        }

        const timezone = detectVisitorTimezone();
        if (!shouldUpdateVisitorTimezone(contactState.currentUser, timezone)) {
          return timezone;
        }

        const updated = await dispatch('setCustomAttributes', { timezone });
        return updated ? timezone : null;
      } catch (error) {
        return null;
      } finally {
        ensureTimezoneInFlight = null;
      }
    })();

    return ensureTimezoneInFlight;
  },
  deleteCustomAttribute: async (_, customAttribute) => {
    try {
      await ContactsAPI.deleteCustomAttribute(customAttribute);
    } catch (error) {
      // Ignore error
    }
  },
};

export const mutations = {
  [SET_CURRENT_USER]($state, user) {
    const { currentUser } = $state;
    $state.currentUser = { ...currentUser, ...user };
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
