
'use server';
/**
 * @fileOverview A flow to retrieve the scheduler's settings.
 *
 * - getSchedulerSettings - Fetches the current availability settings.
 * - SchedulerSettings - The type definition for the settings object.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSchedulerSettingsFromSheet } from '@/services/google-sheets';
import { ALL_POSSIBLE_TIMES } from '@/lib/datetime-utils';

const SchedulerSettingsSchema = z.object({
  availableWeekdays: z.array(z.number()).describe("An array of weekday numbers (0-6) that are available for booking."),
  disabledDates: z.array(z.string()).describe("An array of dates in 'yyyy-MM-dd' format that are disabled for booking."),
  availableTimeSlots: z.array(z.string()).describe("An array of time slots in HH:mm format that are available for booking."),
});
export type SchedulerSettings = z.infer<typeof SchedulerSettingsSchema>;

export async function getSchedulerSettings(): Promise<SchedulerSettings> {
  return getSchedulerSettingsFlow();
}

const getSchedulerSettingsFlow = ai.defineFlow(
  {
    name: 'getSchedulerSettingsFlow',
    inputSchema: z.void(),
    outputSchema: SchedulerSettingsSchema,
  },
  async () => {
      return await getSchedulerSettingsFromSheet();
  }
);
