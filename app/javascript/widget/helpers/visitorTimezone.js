/**
 * Detect the visitor's IANA timezone from the browser.
 * @returns {string}
 */
export const detectVisitorTimezone = () => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Whether contact.custom_attributes.timezone should be written.
 * @param {Object|null|undefined} currentUser
 * @param {string} detectedTimezone
 * @returns {boolean}
 */
export const shouldUpdateVisitorTimezone = (currentUser, detectedTimezone) => {
  const saved = currentUser?.custom_attributes?.timezone;
  return !saved || saved !== detectedTimezone;
};
