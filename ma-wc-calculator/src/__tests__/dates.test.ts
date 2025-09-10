import { weeksBetween, isDateInPeriod, isValidISODate, getCurrentDate } from '../utils/dates';

describe('weeksBetween', () => {
  test('calculates correct weeks for exact week periods', () => {
    const result = weeksBetween('2022-09-16', '2023-03-16', 'days');
    expect(result.days).toBe(181); // 26 weeks * 7 days = 182, but actual days = 181
    expect(result.weeksDecimal).toBe(25.8571);
    expect(result.fullWeeks).toBe(25);
    expect(result.fractionalWeeks).toBe(0.8571);
  });

  test('handles same-day calculation', () => {
    const result = weeksBetween('2025-01-01', '2025-01-01', 'days');
    expect(result.days).toBe(0);
    expect(result.weeksDecimal).toBe(0);
    expect(result.fullWeeks).toBe(0);
    expect(result.fractionalWeeks).toBe(0);
  });

  test('handles one day difference', () => {
    const result = weeksBetween('2025-01-01', '2025-01-02', 'days');
    expect(result.days).toBe(1);
    expect(result.weeksDecimal).toBe(0.1429);
    expect(result.fullWeeks).toBe(0);
    expect(result.fractionalWeeks).toBe(0.1429);
  });

  test('handles exact weeks calculation', () => {
    const result = weeksBetween('2025-01-01', '2025-01-15', 'days');
    expect(result.days).toBe(14);
    expect(result.weeksDecimal).toBe(2);
    expect(result.fullWeeks).toBe(2);
    expect(result.fractionalWeeks).toBe(0);
  });

  test('throws error for end date before start date', () => {
    expect(() => {
      weeksBetween('2025-01-15', '2025-01-01', 'days');
    }).toThrow('End date must be greater than or equal to start date');
  });

  test('calendar mode calculates differently than days mode', () => {
    const daysResult = weeksBetween('2025-01-01', '2025-01-15', 'days');
    const calendarResult = weeksBetween('2025-01-01', '2025-01-15', 'calendar');
    
    expect(daysResult.weeksDecimal).toBe(2); // 14 days / 7
    // Calendar result may differ based on week boundaries
    expect(calendarResult.weeksDecimal).toBeGreaterThanOrEqual(2);
  });
});

describe('isDateInPeriod', () => {
  test('returns true for date within period', () => {
    expect(isDateInPeriod('2025-01-15', '2024-10-01', '2025-09-30')).toBe(true);
  });

  test('returns true for date at period boundaries', () => {
    expect(isDateInPeriod('2024-10-01', '2024-10-01', '2025-09-30')).toBe(true);
    expect(isDateInPeriod('2025-09-30', '2024-10-01', '2025-09-30')).toBe(true);
  });

  test('returns false for date outside period', () => {
    expect(isDateInPeriod('2024-09-30', '2024-10-01', '2025-09-30')).toBe(false);
    expect(isDateInPeriod('2025-10-01', '2024-10-01', '2025-09-30')).toBe(false);
  });
});

describe('isValidISODate', () => {
  test('returns true for valid ISO date format', () => {
    expect(isValidISODate('2025-01-15')).toBe(true);
    expect(isValidISODate('2024-12-31')).toBe(true);
    expect(isValidISODate('2023-02-28')).toBe(true);
  });

  test('returns false for invalid formats', () => {
    expect(isValidISODate('2025-1-15')).toBe(false); // Single digit month
    expect(isValidISODate('25-01-15')).toBe(false); // Two digit year
    expect(isValidISODate('2025/01/15')).toBe(false); // Wrong separator
    expect(isValidISODate('invalid')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  test('returns false for invalid dates', () => {
    expect(isValidISODate('2025-02-30')).toBe(false); // February 30th
    expect(isValidISODate('2025-13-01')).toBe(false); // Month 13
    expect(isValidISODate('2025-01-32')).toBe(false); // Day 32
  });
});

describe('getCurrentDate', () => {
  test('returns date in ISO format', () => {
    const result = getCurrentDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isValidISODate(result)).toBe(true);
  });
});