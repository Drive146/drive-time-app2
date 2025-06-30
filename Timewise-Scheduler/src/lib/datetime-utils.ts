
import { getDay, isAfter, isEqual, startOfDay, format } from 'date-fns';

export const SLOT_CAPACITY = 20;

export const getBookingStartDate = (): Date => {
    // The program starts on Monday, June 30th, 2025.
    // Note: The month is 0-indexed in JavaScript's Date constructor (5 = June).
    return startOfDay(new Date(2025, 5, 30)); 
};

/**
 * Define the full range of possible booking time slots, hourly from 9 AM to 8 PM.
 * Format is HH:mm.
 */
export const ALL_POSSIBLE_TIMES: string[] = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

/**
 * Checks if a given date is an available booking slot.
 * This is a simplified check for client-side rendering before full data is loaded.
 * The authoritative check is done by the `disabled` callback in the calendar component.
 * @param date The date to check.
 * @param startDate The date from which bookings are available.
 * @param availableWeekdays An array of weekday numbers (0-6) that are available.
 * @param disabledDates An array of date strings ('yyyy-MM-dd') to manually disable.
 * @returns True if the date is an available slot, false otherwise.
 */
export function isAvailable(date: Date, startDate: Date, availableWeekdays: number[], disabledDates: string[]): boolean {
  const cleanDate = startOfDay(date);
  const dateStr = format(cleanDate, 'yyyy-MM-dd');

  // Check if the date is in the manually disabled list
  if (disabledDates.includes(dateStr)) {
    return false;
  }
  
  const day = getDay(date); // Sunday is 0, Monday is 1, ..., Saturday is 6

  // Check if the date is on or after the general start date
  const dateIsOnOrAfterStartDate = isAfter(cleanDate, startDate) || isEqual(cleanDate, startDate);
  if (!dateIsOnOrAfterStartDate) {
    return false;
  }

  // Check if the day of the week is in the available list
  const isAvailableDayOfWeek = availableWeekdays.includes(day);

  return isAvailableDayOfWeek;
}
