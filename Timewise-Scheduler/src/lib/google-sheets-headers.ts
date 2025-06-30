/**
 * @fileOverview Defines the headers for the Google Sheet.
 * This provides a single source of truth for column names,
 * making the sheet integration more robust and easier to maintain.
 */

export const sheetHeaders = ['Timestamp', 'Name', 'Email', 'Phone Number', 'WhatsApp Number', 'Booking Date', 'Booking Time'] as const;
export const bookingDateHeader: typeof sheetHeaders[5] = 'Booking Date';
export const bookingTimeHeader: typeof sheetHeaders[6] = 'Booking Time';

export const settingsSheetHeaders = ['Setting', 'Value'] as const;
