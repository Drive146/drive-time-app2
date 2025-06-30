
'use server';

import type { GaxiosError } from 'gaxios';
import { getCalendarClient } from './google-auth';

interface EventDetails {
  name: string;
  email: string;
  bookingDate: Date;
}

export async function createCalendarEvent({ name, email, bookingDate }: EventDetails): Promise<{ htmlLink: string; hangoutLink?: string }> {
    const calendar = await getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const staticHangoutLink = process.env.GOOGLE_MEET_LINK; // Use a static link from .env

    if (!calendarId) {
        throw new Error('Configuration Error: GOOGLE_CALENDAR_ID is not set in the deployment environment.');
    }

    const eventStart = bookingDate;
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    let eventDescription = `This is a booking confirmation for a meeting with ${name} (${email}).`;

    if (staticHangoutLink) {
        eventDescription += `\n\nJoin the meeting here: ${staticHangoutLink}`;
    }

    const event: any = { // Use 'any' to dynamically add properties
        summary: `Drive by Talrop Booking: ${name}`,
        description: eventDescription,
        start: {
            dateTime: eventStart.toISOString(),
            timeZone: 'UTC',
        },
        end: {
            dateTime: eventEnd.toISOString(),
            timeZone: 'UTC',
        },
        attendees: [{ email }],
    };

    // Only add video conferencing info if a static link is provided.
    if (staticHangoutLink) {
        event.conferenceData = {
            entryPoints: [{
                entryPointType: 'video',
                uri: staticHangoutLink,
                label: `Join meeting`,
            }],
        };
        event.location = staticHangoutLink;
    }


    try {
        const createdEvent = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
            // By not including conferenceDataVersion, we prevent auto-creation of a Meet link
            sendNotifications: true,
        });
        
        const htmlLink = createdEvent.data.htmlLink;
        // The hangoutLink is ONLY the static link. It will be undefined if not set in .env.
        const hangoutLink = staticHangoutLink;

        if (htmlLink) {
            console.log('Google Calendar event created successfully.');
            return { htmlLink, hangoutLink };
        } else {
            console.error('Event was created, but no htmlLink was returned. Full event data:', JSON.stringify(createdEvent.data, null, 2));
            throw new Error('A calendar event was created, but Google did not return a link to the event.');
        }
    } catch (e: any) {
        // If the error is coming from our custom auth logic, it will have a clear message.
        if (e.message.includes('GOOGLE_PRIVATE_KEY')) {
            console.error('Google Auth Error:', e.message);
            throw e; // Re-throw the detailed error to be displayed to the user.
        }

        const error = e as GaxiosError;
        const gaxiosErrorMessage = error.response?.data?.error_description || error.response?.data?.error?.message || e.message;
        console.error('Error creating Google Calendar event:', JSON.stringify(error.response?.data || error.message, null, 2));
        
        let userMessage = `An error occurred with the Google Calendar API.`;

        if (gaxiosErrorMessage?.includes('invalid_grant')) {
            userMessage = 
`Authentication failed: "invalid_grant". This means the private key and service account email do not match. Please double-check:
1. The GOOGLE_SERVICE_ACCOUNT_EMAIL in your environment variables is correct.
2. The GOOGLE_PRIVATE_KEY is the correct one for that specific service account. If you've created multiple keys, ensure you've copied the right one.
Original error: ${gaxiosErrorMessage}`;
        } else if (error.response?.data?.error?.message) {
            const errorBody = error.response?.data?.error;
            if (errorBody.code === 403 && errorBody.message.includes('API has not been used')) {
                userMessage = 'The Google Calendar API is not enabled for your project. Please enable it in the Google Cloud Console and try again.';
            } else {
                 userMessage = `Google Calendar API Error: ${errorBody.message}`;
            }
        } else {
            userMessage = gaxiosErrorMessage;
        }
        
        throw new Error(userMessage);
    }
}
