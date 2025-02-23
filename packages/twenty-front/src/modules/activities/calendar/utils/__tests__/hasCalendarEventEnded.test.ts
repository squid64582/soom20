import { addDays, addHours, subDays, subHours } from 'date-fns';

import { hasCalendarEventEnded } from '../hasCalendarEventEnded';

describe('hasCalendarEventEnded', () => {
  describe('Event with end date', () => {
    it('returns true for an event with a past end date', () => {
      // Given
      const startsAt = subHours(new Date(), 2);
      const endsAt = subHours(new Date(), 1);
      const isFullDay = false;

      // When
      const result = hasCalendarEventEnded({
        startsAt,
        endsAt,
        isFullDay,
      });

      // Then
      expect(result).toBe(true);
    });

    it('returns false for an event if end date is now', () => {
      // Given
      const startsAt = subHours(new Date(), 1);
      const endsAt = new Date();
      const isFullDay = false;

      // When
      const result = hasCalendarEventEnded({
        startsAt,
        endsAt,
        isFullDay,
      });

      // Then
      expect(result).toBe(false);
    });

    it('returns false for an event with a future end date', () => {
      // Given
      const startsAt = new Date();
      const endsAt = addHours(new Date(), 1);
      const isFullDay = false;

      // When
      const result = hasCalendarEventEnded({
        startsAt,
        endsAt,
        isFullDay,
      });

      // Then
      expect(result).toBe(false);
    });
  });

  describe('Full day event', () => {
    it('returns true for a past full day event', () => {
      // Given
      const startsAt = subDays(new Date(), 1);
      const isFullDay = true;

      // When
      const result = hasCalendarEventEnded({
        startsAt,
        isFullDay,
      });

      // Then
      expect(result).toBe(true);
    });

    it('returns false for a future full day event', () => {
      // Given
      const startsAt = addDays(new Date(), 1);
      const isFullDay = true;

      // When
      const result = hasCalendarEventEnded({
        startsAt,
        isFullDay,
      });

      // Then
      expect(result).toBe(false);
    });

    it('returns false if the full day event is today', () => {
      // Given
      const startsAt = new Date();
      const isFullDay = true;

      // When
      const result = hasCalendarEventEnded({
        startsAt,
        isFullDay,
      });

      // Then
      expect(result).toBe(false);
    });
  });
});
