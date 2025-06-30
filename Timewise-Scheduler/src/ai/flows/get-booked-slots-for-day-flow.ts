
'use server';
/**
 * @fileOverview A flow to retrieve booked time slot counts for a specific day.
 *
 * - getBookedSlotsForDay - A function that returns a map of time slots to their booking counts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBookedTimeSlotsForDay } from '@/services/google-sheets';

const GetBookedSlotsForDayOutputSchema = z.record(z.string(), z.number()).describe('A map where keys are time slots in HH:mm format and values are the number of bookings for that slot.');

export async function getBookedSlotsForDay(date: string): Promise<Record<string, number>> {
  return getBookedSlotsForDayFlow(date);
}

const getBookedSlotsForDayFlow = ai.defineFlow(
  {
    name: 'getBookedSlotsForDayFlow',
    inputSchema: z.string().describe("The date to check in 'yyyy-MM-dd' format."),
    outputSchema: GetBookedSlotsForDayOutputSchema,
  },
  async (date) => {
    return await getBookedTimeSlotsForDay(date);
  }
);
