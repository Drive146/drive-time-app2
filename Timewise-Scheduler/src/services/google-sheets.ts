
'use server';

import type { GaxiosError } from 'gaxios';
import { type StoreUserDetailsInput } from '@/ai/flows/store-user-details';
import { type SchedulerSettings } from '@/ai/flows/get-scheduler-settings-flow';
import { format, getMonth, getYear, startOfDay } from 'date-fns';
import { getSheetsClient } from './google-auth';
import { sheetHeaders, bookingDateHeader, bookingTimeHeader, settingsSheetHeaders } from '@/lib/google-sheets-headers';
import { ALL_POSSIBLE_TIMES } from '@/lib/datetime-utils';

const DEFAULT_SETTINGS: SchedulerSettings = {
    availableWeekdays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    disabledDates: [],
    availableTimeSlots: ALL_POSSIBLE_TIMES,
};

// Function to get booking counts for a specific month
export async function getBookingCountsForMonth(year: number, month: number): Promise<Record<string, number>> {
  const sheets = await getSheetsClient();
  if (!sheets) {
    console.warn('Google Sheets client not available. Returning empty booking counts.');
    return {};
  }
  
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Bookings';
  if (!sheetId) return {};

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    const rows = response.data.values;
    const bookingCounts: Record<string, number> = {};

    if (!rows || rows.length === 0) return bookingCounts;

    const headers = rows[0] as string[];
    const dateColumnIndex = headers.indexOf(bookingDateHeader);

    if (dateColumnIndex === -1) {
      console.warn(`The booking sheet requires a "${bookingDateHeader}" column, but it was not found. Assuming no bookings for this month.`);
      return bookingCounts;
    }
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateStr = row[dateColumnIndex];
        if (dateStr) {
            try {
                const bookingDate = startOfDay(new Date(dateStr));
                 if (getYear(bookingDate) === year && getMonth(bookingDate) === month) {
                    const formattedDate = format(bookingDate, 'yyyy-MM-dd');
                    bookingCounts[formattedDate] = (bookingCounts[formattedDate] || 0) + 1;
                }
            } catch (e) {
                console.warn(`Could not parse date from sheet: ${dateStr}`);
            }
        }
    }
    return bookingCounts;
  } catch (e: any) {
    console.error(`Could not fetch booking counts due to a Google Sheets error. Please check your configuration. Message: ${e.message}`);
    return {};
  }
}

// Function to get all booked time slots for a specific day
export async function getBookedTimeSlotsForDay(date: string): Promise<Record<string, number>> {
  const sheets = await getSheetsClient();
  if (!sheets) {
    console.warn('Google Sheets client not available. Returning empty booked slots.');
    return {};
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Bookings';
  if (!sheetId) return {};
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return {};

    const headers = rows[0];
    const dateColIdx = headers.indexOf(bookingDateHeader);
    const timeColIdx = headers.indexOf(bookingTimeHeader);

    if (dateColIdx === -1 || timeColIdx === -1) {
        console.warn(`The booking sheet requires "${bookingDateHeader}" and "${bookingTimeHeader}" columns, but one or both were not found. Assuming no booked slots for this day.`);
        return {};
    }

    const bookedTimeCounts: Record<string, number> = {};
    rows
      .slice(1)
      .filter(row => row[dateColIdx] === date)
      .forEach(row => {
          const time = row[timeColIdx];
          if (time) {
            bookedTimeCounts[time] = (bookedTimeCounts[time] || 0) + 1;
          }
      });

    return bookedTimeCounts;
  } catch (e: any) {
    console.error(`Could not fetch booked time slots due to a Google Sheets error. Please check your configuration. Message: ${e.message}`);
    return {};
  }
}

// Function to append user details
export async function appendUserDetails(details: StoreUserDetailsInput): Promise<void> {
  const sheets = await getSheetsClient();
  if (!sheets) {
    throw new Error('Configuration Error: Google Sheets integration is not configured on the server. Cannot save booking.');
  }
  
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Bookings';
  if (!sheetId) throw new Error('Configuration Error: GOOGLE_SHEET_ID is not configured.');

  try {
    await ensureSheetAndHeader(sheets, sheetId, sheetName, sheetHeaders);

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      details.name,
      details.email,
      details.phoneNumber,
      details.whatsappNumber,
      details.bookingDate,
      details.bookingTime,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: sheetName,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  } catch (e: any) {
    console.error(`Could not append user details due to a Google Sheets error. Please check your configuration. Message: ${e.message}`);
    throw new Error(`Failed to save booking. Please try again later. (Reason: Google Sheets Error)`);
  }
}

// --- Settings Management ---
async function ensureSettingsSheet(sheets: any, spreadsheetId: string, sheetName: string) {
    try {
        await ensureSheetAndHeader(sheets, spreadsheetId, sheetName, settingsSheetHeaders);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A2:B4`
        });

        const values = response.data.values || [];
        const settingsMap = new Map(values.map(row => [row[0], row[1]]));

        const settingsToWrite = [];
        if (!settingsMap.has('availableWeekdays')) {
            settingsToWrite.push(['availableWeekdays', DEFAULT_SETTINGS.availableWeekdays.join(',')]);
        }
        if (!settingsMap.has('disabledDates')) {
            settingsToWrite.push(['disabledDates', '']);
        }
        if (!settingsMap.has('availableTimeSlots')) {
            settingsToWrite.push(['availableTimeSlots', DEFAULT_SETTINGS.availableTimeSlots.join(',')]);
        }

        if (settingsToWrite.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A2`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: settingsToWrite }
            });
        }
    } catch(e: any) {
         const errorMessage = (e as GaxiosError).response?.data?.error?.message || '';
         if (errorMessage.includes('Unable to parse range')) {
            await sheets.spreadsheets.values.update({
                 spreadsheetId,
                 range: `${sheetName}!A2`,
                 valueInputOption: 'USER_ENTERED',
                 requestBody: { values: [
                    ['availableWeekdays', DEFAULT_SETTINGS.availableWeekdays.join(',')],
                    ['disabledDates', ''],
                    ['availableTimeSlots', DEFAULT_SETTINGS.availableTimeSlots.join(',')]
                 ]}
            });
         } else {
            throw e;
         }
    }
}


export async function getSchedulerSettingsFromSheet(): Promise<SchedulerSettings> {
    const sheets = await getSheetsClient();
    if (!sheets) {
        console.warn('Google Sheets client not available. Using default scheduler settings.');
        return DEFAULT_SETTINGS;
    }
    
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SETTINGS_SHEET_NAME || 'Settings';
    if (!sheetId) return DEFAULT_SETTINGS;

    try {
        await ensureSettingsSheet(sheets, sheetId, sheetName);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A2:B`,
        });

        const values = response.data.values;
        if (!values) return DEFAULT_SETTINGS;

        const settingsMap = new Map(values.map(row => [row[0], row[1]]));

        const availableWeekdaysStr = settingsMap.get('availableWeekdays');
        const disabledDatesStr = settingsMap.get('disabledDates');
        const availableTimeSlotsStr = settingsMap.get('availableTimeSlots');

        return {
            availableWeekdays: availableWeekdaysStr ? availableWeekdaysStr.split(',').map(Number) : DEFAULT_SETTINGS.availableWeekdays,
            disabledDates: disabledDatesStr ? disabledDatesStr.split(',').filter(Boolean) : DEFAULT_SETTINGS.disabledDates,
            availableTimeSlots: availableTimeSlotsStr ? availableTimeSlotsStr.split(',') : DEFAULT_SETTINGS.availableTimeSlots,
        };

    } catch (e: any) {
        console.error(`Could not fetch scheduler settings due to a Google Sheets error. Please check your configuration. Message: ${e.message}`);
        console.warn('Returning default settings due to Google Sheets API error.');
        return DEFAULT_SETTINGS;
    }
}

export async function updateSchedulerSettingsInSheet(settings: SchedulerSettings): Promise<void> {
    const sheets = await getSheetsClient();
    if (!sheets) {
        throw new Error('Configuration Error: Google Sheets integration is not configured on the server. Cannot save settings.');
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SETTINGS_SHEET_NAME || 'Settings';
    if (!sheetId) throw new Error('Configuration Error: GOOGLE_SHEET_ID is not configured.');

    try {
        await ensureSettingsSheet(sheets, sheetId, sheetName);

        const values = [
            ['availableWeekdays', settings.availableWeekdays.join(',')],
            ['disabledDates', settings.disabledDates.join(',')],
            ['availableTimeSlots', settings.availableTimeSlots.join(',')],
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!A2:B4`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
    } catch (e: any) {
        console.error(`Could not update settings due to a Google Sheets error. Please check your configuration. Message: ${e.message}`);
        throw new Error('Failed to save settings. Please try again later. (Reason: Google Sheets Error)');
    }
}


// --- Helper Functions ---
async function ensureSheetAndHeader(sheets: any, spreadsheetId: string, sheetName: string, headers: readonly string[]) {
  try {
    await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:Z1`,
    });
  } catch (err: any) {
    const errorMsg = (err as GaxiosError).response?.data?.error?.message || '';
    if (errorMsg.includes("Unable to parse range")) {
      try {
       await sheets.spreadsheets.batchUpdate({
         spreadsheetId: spreadsheetId,
         requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
       });
      } catch(e: any) {
        const nestedErrorMsg = (e as Error).message || '';
        if (!nestedErrorMsg.includes('already exists')) throw e;
      }
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    } else {
        throw err;
    }
  }
}
