
'use server';
/**
 * @fileOverview A flow to send a booking confirmation email and create a calendar event.
 *
 * - sendConfirmationEmail - A function that handles sending the confirmation email and creating a calendar event.
 * - SendConfirmationEmailInput - The input type for the sendConfirmationEmail function.
 * - SendConfirmationEmailOutput - The return type for the sendConfirmationEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { sendEmail } from '@/services/email-service';
import { generateGoogleCalendarLink } from '@/lib/calendar-links';
import { createCalendarEvent } from '@/services/google-calendar';
import { addHours, parse } from 'date-fns';

const SendConfirmationEmailInputSchema = z.object({
  name: z.string().describe('The name of the user.'),
  email: z.string().email().describe('The email address of the user.'),
  bookingDate: z.string().describe('The date of the booking in YYYY-MM-DD format.'),
  bookingTime: z.string().describe('The time of the booking in HH:mm format.'),
  formattedDate: z.string().describe('The human-readable formatted date and time of the booking.'),
});
export type SendConfirmationEmailInput = z.infer<typeof SendConfirmationEmailInputSchema>;

const SendConfirmationEmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was successfully sent.'),
  message: z.string().describe('A message indicating the outcome of the operation.'),
  hangoutLink: z.string().url().optional().describe('The Google Meet link for the meeting.'),
  googleCalendarLink: z.string().url().optional().describe('The link to add the event to Google Calendar.'),
});
export type SendConfirmationEmailOutput = z.infer<typeof SendConfirmationEmailOutputSchema>;

export async function sendConfirmationEmail(input: SendConfirmationEmailInput): Promise<SendConfirmationEmailOutput> {
  return sendConfirmationEmailFlow(input);
}

const sendConfirmationEmailFlow = ai.defineFlow(
  {
    name: 'sendConfirmationEmailFlow',
    inputSchema: SendConfirmationEmailInputSchema,
    outputSchema: SendConfirmationEmailOutputSchema,
  },
  async (input) => {
    let hangoutLink: string | undefined;
    let googleCalendarLink: string | undefined;

    try {
        const eventStartDateTime = parse(`${input.bookingDate} ${input.bookingTime}`, 'yyyy-MM-dd HH:mm', new Date());

        // Create Google Calendar event and get the links.
        try {
            const calendarEvent = await createCalendarEvent({
                name: input.name,
                email: input.email,
                bookingDate: eventStartDateTime,
            });
            hangoutLink = calendarEvent.hangoutLink;
            
            const eventEndDateTime = addHours(eventStartDateTime, 1);
            const calendarDescription = `Your booking for Drive by Talrop is confirmed.\n\nJoin the meeting here: ${hangoutLink || 'Not available'}`;
            googleCalendarLink = generateGoogleCalendarLink({
                title: `Drive by Talrop Booking: ${input.name}`,
                start: eventStartDateTime,
                end: eventEndDateTime,
                description: calendarDescription,
                location: hangoutLink,
            });

        } catch (calendarError: any) {
            console.error('Failed to create calendar event:', calendarError.message);
            // Don't block the email if calendar creation fails, just log it.
        }

      const subject = "Your Drive by Talrop Booking is Confirmed";
      const body = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmation</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1f2937; margin: 0; padding: 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
                            <tr>
                                <td align="center" style="padding: 40px;">
                                    <h1 style="font-size: 28px; color: #111827; margin-top: 0; margin-bottom: 16px; font-weight: 600;">Booking Confirmed!</h1>
                                    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin: 0 0 24px;">Hi ${input.name},</p>
                                    <p style="font-size: 16px; color: #374151; line-height: 1.7; margin: 0 0 16px;">Your booking for the Drive by Talrop program is confirmed. We're excited to see you!</p>
                                    <p style="font-size: 18px; color: #111827; line-height: 1.7; margin: 0 0 32px; font-weight: 600;">${input.formattedDate}</p>
                                    
                                    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                                        <tr>
                                            ${hangoutLink ? `
                                            <td align="center" style="border-radius: 8px; padding-right: 10px;" bgcolor="#3B82F6">
                                                <a href="${hangoutLink}" target="_blank" style="font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 14px 28px; border: 1px solid #3B82F6; display: inline-block;">Join Google Meet</a>
                                            </td>` : ''}
                                            ${googleCalendarLink ? `
                                            <td align="center" style="border-radius: 8px;" bgcolor="#F1F5F9">
                                                <a href="${googleCalendarLink}" target="_blank" style="font-size: 16px; font-weight: 600; color: #1f2937; text-decoration: none; border-radius: 8px; padding: 14px 28px; border: 1px solid #e2e8f0; display: inline-block;">Add to Calendar</a>
                                            </td>` : ''}
                                        </tr>
                                    </table>

                                    <div style="text-align: left; margin-top: 32px; background-color: #f3f4f6; border-left: 4px solid #3B82F6; padding: 16px;">
                                        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0; font-weight: 600;">What's Next?</p>
                                        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0; margin-top: 4px;">Your meeting is confirmed. Add the event to your calendar to get reminders before the scheduled time.</p>
                                    </div>
                                    
                                    <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 32px 0 0;">If you have any questions, feel free to reply to this email.</p>
                                    <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 32px 0 0;">Best regards,<br>The Drive by Talrop Team</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `;

      const emailResult = await sendEmail({
        to: input.email,
        subject,
        html: body,
      });
      
      return { ...emailResult, hangoutLink, googleCalendarLink };

    } catch (error: any) {
        let errorMessage = 'An unexpected error occurred. Please check server logs.';
        if (error && typeof error.message === 'string' && error.message.trim() !== '') {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        console.error('Error in sendConfirmationEmailFlow:', errorMessage);
        
        return {
            success: false,
            message: `Failed to send confirmation email: ${errorMessage}`,
            hangoutLink,
            googleCalendarLink,
        }
    }
  }
);
