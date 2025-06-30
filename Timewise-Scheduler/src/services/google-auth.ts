'use server';

import { google } from 'googleapis';

/**
 * Creates a Google Auth client.
 * Returns null if the required environment variables are not set,
 * preventing the application from crashing.
 */
function getGoogleAuth() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyInput = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKeyInput) {
        console.warn('Configuration Warning: Missing Google Service Account credentials. Google Sheets and Calendar integration will be disabled.');
        return null;
    }
    
    // The key might be passed with \\n instead of \n.
    const formattedPrivateKey = String(privateKeyInput).replace(/\\n/g, '\n');
    
    // A simple regex to confirm it's likely a PEM key.
    const keyRegex = /(-----BEGIN PRIVATE KEY-----(?:.|\n)*?-----END PRIVATE KEY-----)/;
    const match = formattedPrivateKey.match(keyRegex);

    if (!match || !match[1]) {
        console.error("Configuration Error: The GOOGLE_PRIVATE_KEY environment variable is set, but its format is incorrect. It must be a valid PEM key. Google Sheets and Calendar integration will be disabled.");
        return null;
    }
    
    return new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: match[1],
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/calendar'],
    });
}

/**
 * Returns a Google Sheets client if authentication is configured, otherwise null.
 */
export async function getSheetsClient() {
    const auth = getGoogleAuth();
    if (!auth) return null;
    return google.sheets({version: 'v4', auth});
}

/**
 * Returns a Google Calendar client if authentication is configured, otherwise null.
 */
export async function getCalendarClient() {
    const auth = getGoogleAuth();
    if (!auth) return null;
    return google.calendar({ version: 'v3', auth });
}
