
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

// Helper to create user-friendly error messages from Google API errors.
function getGoogleSheetsErrorMessage(e: any, sheetName: string): string {
    const errorMessage = e?.message || '';
    if (errorMessage.startsWith('Configuration Error:')) {
        return errorMessage; 
    }

    const error = e as GaxiosError;
    const gaxiosErrorMessage = error.response?.data?.error_description || error.response?.data?.error?.message || e.message;
    
    console.error('Raw Google Sheets Error:', JSON.stringify(error.response?.data || e.message, null, 2));

    if (errorMessage.includes('invalid_grant')) {
        return (
`Authentication failed: "invalid_grant". This likely means the private key and service account email do not match. Please double-check your GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.`
        );
    }
    
    if (error.response?.data?.error?.message) {
        const msg = error.response.data.error.message;
        if (msg.includes('Unable to parse range')) {
             return `The sheet (tab) name "${sheetName}" might be incorrect or the sheet is missing. Please check your GOOGLE_SHEET_NAME/GOOGLE_SETTINGS_SHEET_NAME in the environment configuration. Note: The name is case-sensitive.`;
        }
        if (error.response?.data?.error?.code === 403 && msg.includes('API has not been used')) {
            return 'The Google Sheets API is not enabled for your project. Please enable it in the Google Cloud Console and try again.';
        }
        return `Google Sheets API Error: ${msg}`;
    }

    return gaxiosErrorMessage || 'An unknown error occurred with Google Sheets.';
}


// Function to get booking counts for a specific month
export async function getBookingCountsForMonth(year: number, month: number): Promise<Record<string, number>> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Bookings';

  if (!sheetId) {
    throw new Error('Configuration Error: Missing GOOGLE_SHEET_ID. This needs to be set in the deployment environment.');
  }

  try {
    const sheets = await getSheetsClient();
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
    const message = getGoogleSheetsErrorMessage(e, sheetName!);
    console.error(`Could not fetch booking counts due to a Google Sheets error. Please check your configuration. Message: ${message}`);
    throw new Error(message);
  }
}

// Function to get all booked time slots for a specific day
export async function getBookedTimeSlotsForDay(date: string): Promise<Record<string, number>> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Bookings';

   if (!sheetId) {
    throw new Error('Configuration Error: Missing GOOGLE_SHEET_ID. This needs to be set in the deployment environment.');
  }
  
  try {
    const sheets = await getSheetsClient();
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
    const message = getGoogleSheetsErrorMessage(e, sheetName!);
    console.error(`Could not fetch booked time slots due to a Google Sheets error. Please check your configuration. Message: ${message}`);
    throw new Error(message);
  }
}

// Function to append user details
export async function appendUserDetails(details: StoreUserDetailsInput): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Bookings';

  if (!sheetId) {
    throw new Error('Configuration Error: Missing GOOGLE_SHEET_ID. This needs to be set in the deployment environment.');
  }
  
  try {
    const sheets = await getSheetsClient();
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
    const message = getGoogleSheetsErrorMessage(e, sheetName!);
    throw new Error(message);
  }
}

// --- Settings Management ---
async function ensureSettingsSheet(sheets: any, spreadsheetId: string, sheetName: string) {
    try {
        await ensureSheetAndHeader(sheets, spreadsheetId, sheetName, settingsSheetHeaders);

        // Check if default settings need to be written
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
        // This can happen if the sheet exists but is empty.
        // In this case we write the full default config
         const errorMessage = e?.message || '';
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
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SETTINGS_SHEET_NAME || 'Settings';
    if (!sheetId) {
        console.warn('Configuration Error: Missing GOOGLE_SHEET_ID. Using default scheduler settings.');
        return DEFAULT_SETTINGS;
    }

    try {
        const sheets = await getSheetsClient();
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
        const message = getGoogleSheetsErrorMessage(e, sheetName);
        console.error(`Could not fetch scheduler settings due to a Google Sheets error. Please check your configuration. Message: ${message}`);
        throw new Error(message);
    }
}

export async function updateSchedulerSettingsInSheet(settings: SchedulerSettings): Promise<void> {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SETTINGS_SHEET_NAME || 'Settings';
    if (!sheetId) throw new Error('Configuration Error: GOOGLE_SHEET_ID is not configured.');

    try {
        const sheets = await getSheetsClient();
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
        const message = getGoogleSheetsErrorMessage(e, sheetName);
        throw new Error(message);
    }
}


// --- Helper Functions ---
async function ensureSheetAndHeader(sheets: any, spreadsheetId: string, sheetName: string, headers: readonly string[]) {
  try {
    // This will throw if the sheet or range does not exist
    await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:A1`,
    });
  } catch (err: any) {
    const errorMsg = err?.response?.data?.error?.message || '';
    // This specific error message indicates the sheet itself is missing.
    if (errorMsg.includes("Unable to parse range")) {
      try {
       // Create the sheet
       await sheets.spreadsheets.batchUpdate({
         spreadsheetId: spreadsheetId,
         requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
       });
      } catch(e: any) {
        const nestedErrorMsg = e?.message || '';
        // It's possible another process created it in the meantime, which is fine.
        if (!nestedErrorMsg.includes('already exists')) throw e;
      }
      
      // Now that we know the sheet exists, write the header row.
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    } else {
        // Re-throw other errors (e.g., permission denied)
        throw err;
    }
  }
}
