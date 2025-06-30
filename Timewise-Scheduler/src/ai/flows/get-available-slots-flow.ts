
'use server';
/**
 * @fileOverview A flow to retrieve available booking slots for a given month.
 *
 * - getAvailableSlots - A function that returns remaining slots for each available day in a month.
 * - GetAvailableSlotsInput - The input type for the getAvailableSlots function.
 * - GetAvailableSlotsOutput - The return type for the getAvailableSlots function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBookingCountsForMonth } from '@/services/google-sheets';
import { isAvailable, getBookingStartDate, SLOT_CAPACITY } from '@/lib/datetime-utils';
import { eachDayOfInterval, lastDayOfMonth, format, set, getDay, isBefore, startOfDay } from 'date-fns';

const GetAvailableSlotsInputSchema = z.object({
  year: z.number().describe('The year to check for available slots.'),
  month: z.number().describe('The month to check for available slots (0-indexed).'),
  settings: z.object({
      availableWeekdays: z.array(z.number()),
      disabledDates: z.array(z.string()),
      availableTimeSlots: z.array(z.string()),
  }).describe("The scheduler's availability settings.")
});
export type GetAvailableSlotsInput = z.infer<typeof GetAvailableSlotsInputSchema>;

const GetAvailableSlotsOutputSchema = z.record(z.string(), z.number()).describe('A map where keys are dates in "yyyy-MM-dd" format and values are the number of remaining slots.');
export type GetAvailableSlotsOutput = z.infer<typeof GetAvailableSlotsOutputSchema>;

export async function getAvailableSlots(input: GetAvailableSlotsInput): Promise<GetAvailableSlotsOutput> {
  return getAvailableSlotsFlow(input);
}

const getAvailableSlotsFlow = ai.defineFlow(
  {
    name: 'getAvailableSlotsFlow',
    inputSchema: GetAvailableSlotsInputSchema,
    outputSchema: GetAvailableSlotsOutputSchema,
  },
  async ({ year, month, settings }) => {
    
      const bookingCounts = await getBookingCountsForMonth(year, month);
      
      const monthStartDate = set(new Date(), { year, month, date: 1 });
      const monthEndDate = lastDayOfMonth(monthStartDate);
      const daysInMonth = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });
      
      const programStartDate = startOfDay(getBookingStartDate());
      const slots: GetAvailableSlotsOutput = {};
      const totalDailyCapacity = settings.availableTimeSlots.length * SLOT_CAPACITY;

      for (const day of daysInMonth) {
        if (isBefore(day, programStartDate)) {
            continue;
        }

        const dateStr = format(day, 'yyyy-MM-dd');
        const isDayAvailable = settings.availableWeekdays.includes(getDay(day)) && !settings.disabledDates.includes(dateStr);
        
        if (isDayAvailable) {
          const count = bookingCounts[dateStr] || 0;
          slots[dateStr] = Math.max(0, totalDailyCapacity - count);
        }
      }

      return slots;
   
  }
);
