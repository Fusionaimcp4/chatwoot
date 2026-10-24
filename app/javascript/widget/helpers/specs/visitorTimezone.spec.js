import {
  detectVisitorTimezone,
  shouldUpdateVisitorTimezone,
} from '../visitorTimezone';

describe('visitorTimezone', () => {
  describe('#detectVisitorTimezone', () => {
    it('returns the browser IANA timezone', () => {
      const spy = vi
        .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
        .mockReturnValue({ timeZone: 'America/Chicago' });

      expect(detectVisitorTimezone()).toEqual('America/Chicago');
      spy.mockRestore();
    });

    it('falls back to UTC when timezone is missing', () => {
      const spy = vi
        .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
        .mockReturnValue({});

      expect(detectVisitorTimezone()).toEqual('UTC');
      spy.mockRestore();
    });

    it('falls back to UTC when Intl throws', () => {
      const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
        throw new Error('Intl unavailable');
      });

      expect(detectVisitorTimezone()).toEqual('UTC');
      spy.mockRestore();
    });
  });

  describe('#shouldUpdateVisitorTimezone', () => {
    it('returns true when timezone is missing', () => {
      expect(
        shouldUpdateVisitorTimezone(
          { custom_attributes: {} },
          'America/Chicago'
        )
      ).toEqual(true);
      expect(shouldUpdateVisitorTimezone({}, 'America/Chicago')).toEqual(true);
      expect(shouldUpdateVisitorTimezone(null, 'America/Chicago')).toEqual(
        true
      );
    });

    it('returns true when timezone differs', () => {
      expect(
        shouldUpdateVisitorTimezone(
          { custom_attributes: { timezone: 'UTC' } },
          'America/Chicago'
        )
      ).toEqual(true);
    });

    it('returns false when timezone matches', () => {
      expect(
        shouldUpdateVisitorTimezone(
          {
            custom_attributes: {
              timezone: 'America/Chicago',
              plan: 'pro',
            },
          },
          'America/Chicago'
        )
      ).toEqual(false);
    });
  });
});
