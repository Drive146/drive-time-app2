
'use server';

/**
 * @fileOverview A flow to store user details in a Google Sheet.
 *
 * - storeUserDetails - A function that handles storing user details.
 * - StoreUserDetailsInput - The input type for the storeUserDetails function.
 * - StoreUserDetailsOutput - The return type for the storeUserDetails function.
 */

import {ai} from '@/ai/genkit';
import { appendUserDetails } from '@/services/google-sheets';
import {z} from 'genkit';

const StoreUserDetailsInputSchema = z.object({
  name: z.string().describe('The name of the user.'),
  phoneNumber: z.string().describe('The phone number of the user.'),
  email: z.string().email().describe('The email address of the user.'),
  whatsappNumber: z.string().describe('The WhatsApp number of the user.'),
  bookingDate: z.string().describe('The date of the booking in YYYY-MM-DD format.'),
  bookingTime: z.string().describe('The time of the booking in HH:mm format.'),
});
export type StoreUserDetailsInput = z.infer<typeof StoreUserDetailsInputSchema>;

const StoreUserDetailsOutputSchema = z.object({
  success: z.boolean().describe('Whether the user details were successfully stored.'),
  message: z.string().describe('A message indicating the outcome of the operation.'),
});
export type StoreUserDetailsOutput = z.infer<typeof StoreUserDetailsOutputSchema>;

export async function storeUserDetails(input: StoreUserDetailsInput): Promise<StoreUserDetailsOutput> {
  return storeUserDetailsFlow(input);
}

const storeUserDetailsFlow = ai.defineFlow(
  {
    name: 'storeUserDetailsFlow',
    inputSchema: StoreUserDetailsInputSchema,
    outputSchema: StoreUserDetailsOutputSchema,
  },
  async (input) => {
    try {
      await appendUserDetails(input);
      return {
        success: true,
        message: 'User details stored successfully in Google Sheet.',
      };
    } catch (error: any) {
      console.error('Failed to store user details:', error);
      
      let errorMessage = 'An unexpected error occurred while storing details. Please check your service configuration and server logs for more details.';
      if (error && typeof error.message === 'string' && error.message.trim() !== '') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      return {
        success: false,
        message: errorMessage,
      }
    }
  }
);
