'use server';

import type { GaxiosError } from 'gaxios';
import { getCalendarClient } from './google-auth';

interface EventDetails {
  name: string;
  email: string;
  bookingDate: Date;
}

export async function createCalendarEvent({ name, email, bookingDate }: EventDetails): Promise<{ htmlLink?: string; hangoutLink?: string }> {
    const calendar = await getCalendarClient();
    if (!calendar) {
        console.warn('Google Calendar client not available due to missing credentials. Skipping event creation.');
        // Return the static link if available, so it can still be added to the email.
        return { hangoutLink: process.env.GOOGLE_MEET_LINK || undefined };
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const staticHangoutLink = process.env.GOOGLE_MEET_LINK;

    if (!calendarId) {
        console.warn('Configuration Warning: GOOGLE_CALENDAR_ID is not set. Skipping event creation.');
        return { hangoutLink: staticHangoutLink };
    }

    const eventStart = bookingDate;
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration

    let eventDescription = `This is a booking confirmation for a meeting with ${name} (${email}).`;
    if (staticHangoutLink) {
        eventDescription += `\n\nJoin the meeting here: ${staticHangoutLink}`;
    }

    const event: any = {
        summary: `Drive by Talrop Booking: ${name}`,
        description: eventDescription,
        start: { dateTime: eventStart.toISOString(), timeZone: 'UTC' },
        end: { dateTime: eventEnd.toISOString(), timeZone: 'UTC' },
        attendees: [{ email }],
    };

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
            sendNotifications: true,
        });
        
        console.log('Google Calendar event created successfully.');
        return { 
            htmlLink: createdEvent.data.htmlLink || undefined, 
            hangoutLink: staticHangoutLink 
        };

    } catch (e: any) {
        const error = e as GaxiosError;
        const gaxiosErrorMessage = error.response?.data?.error_description || error.response?.data?.error?.message || e.message;
        console.error('Error creating Google Calendar event:', JSON.stringify(error.response?.data || error.message, null, 2));
        
        let userMessage = `An error occurred with the Google Calendar API: ${gaxiosErrorMessage}`;
        if (gaxiosErrorMessage?.includes('invalid_grant')) {
            userMessage = 'Authentication failed with Google Calendar. Please check your service account credentials.';
        } else if (error.response?.data?.error?.message.includes('API has not been used')) {
            userMessage = 'The Google Calendar API is not enabled for your project. Please enable it in the Google Cloud Console.';
        }
        
        // We throw here so the calling flow knows something went wrong,
        // but it will be caught and won't crash the server.
        throw new Error(userMessage);
    }
}
