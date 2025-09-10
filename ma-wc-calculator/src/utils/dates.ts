import { differenceInDays, parseISO, eachWeekOfInterval } from 'date-fns';
import type { WeekCalculation, ProrationMode } from '../types';

/**
 * Calculate weeks between two dates with support for different proration modes
 * 
 * @param start - Start date in ISO format (YYYY-MM-DD)
 * @param end - End date in ISO format (YYYY-MM-DD)
 * @param proration - 'days' for calendar day division, 'calendar' for Mon-Sun week counting
 * @returns WeekCalculation with days, decimal weeks, full weeks, and fractional weeks
 */
export function weeksBetween(
  start: string, 
  end: string, 
  proration: ProrationMode = 'days'
): WeekCalculation {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  
  if (endDate < startDate) {
    throw new Error('End date must be greater than or equal to start date');
  }
  
  const days = differenceInDays(endDate, startDate);
  
  let weeksDecimal: number;
  
  if (proration === 'calendar') {
    // Calendar week counting (Monday to Sunday)
    const weeks = eachWeekOfInterval(
      { start: startDate, end: endDate },
      { weekStartsOn: 1 } // Monday
    );
    weeksDecimal = weeks.length;
  } else {
    // Days-based proration (default)
    weeksDecimal = Number((days / 7).toFixed(4));
  }
  
  const fullWeeks = Math.floor(weeksDecimal);
  const fractionalWeeks = Number((weeksDecimal - fullWeeks).toFixed(4));
  
  return {
    days,
    weeksDecimal,
    fullWeeks,
    fractionalWeeks
  };
}

/**
 * Get the current date in ISO format for "today" calculations
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date falls within the Oct 1 - Sep 30 window
 * 
 * @param date - Date to check in ISO format
 * @param effectiveFrom - Start of period (Oct 1) in ISO format
 * @param effectiveTo - End of period (Sep 30) in ISO format
 * @returns true if date falls within the period
 */
export function isDateInPeriod(date: string, effectiveFrom: string, effectiveTo: string): boolean {
  const checkDate = parseISO(date);
  const startDate = parseISO(effectiveFrom);
  const endDate = parseISO(effectiveTo);
  
  return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Validate that a date string is in proper ISO format and is a valid date
 */
export function isValidISODate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  const date = parseISO(dateString);
  return !isNaN(date.getTime());
}