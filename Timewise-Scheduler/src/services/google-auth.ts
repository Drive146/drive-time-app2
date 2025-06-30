
'use server';

import { google } from 'googleapis';

function getGoogleAuth() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyInput = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKeyInput) {
        throw new Error('Configuration Error: Missing Google Service Account credentials. These need to be set in the deployment environment.');
    }

    const processedKey = String(privateKeyInput).replace(/\\n/g, '\n');
    
    const keyRegex = /(-----BEGIN PRIVATE KEY-----(?:.|\n)*?-----END PRIVATE KEY-----)/;
    const match = processedKey.match(keyRegex);

    if (!match || !match[1]) {
        // This is a critical configuration error.
        throw new Error("Configuration Error: The GOOGLE_PRIVATE_KEY environment variable is set, but its format is incorrect. It must be a valid PEM key.");
    }
    
    const formattedPrivateKey = match[1];
    
    return new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: formattedPrivateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/calendar'],
    });
}

export async function getSheetsClient() {
    const auth = getGoogleAuth();
    return google.sheets({version: 'v4', auth});
}

export async function getCalendarClient() {
    const auth = getGoogleAuth();
    return google.calendar({ version: 'v3', auth });
}
