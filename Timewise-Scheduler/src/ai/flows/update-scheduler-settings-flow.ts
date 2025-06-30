
'use server';
/**
 * @fileOverview A flow to update the scheduler's availability settings.
 *
 * - updateSchedulerSettings - A function that saves the new settings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { updateSchedulerSettingsInSheet } from '@/services/google-sheets';
import { type SchedulerSettings } from './get-scheduler-settings-flow';

const UpdateSchedulerSettingsInputSchema = z.object({
  availableWeekdays: z.array(z.number()),
  disabledDates: z.array(z.string()),
  availableTimeSlots: z.array(z.string()),
});

const UpdateSchedulerSettingsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export async function updateSchedulerSettings(settings: SchedulerSettings): Promise<{ success: boolean; message: string; }> {
  return updateSchedulerSettingsFlow(settings);
}

const updateSchedulerSettingsFlow = ai.defineFlow(
  {
    name: 'updateSchedulerSettingsFlow',
    inputSchema: UpdateSchedulerSettingsInputSchema,
    outputSchema: UpdateSchedulerSettingsOutputSchema,
  },
  async (settings) => {
    try {
      await updateSchedulerSettingsInSheet(settings);
      return {
        success: true,
        message: 'Settings updated successfully.',
      };
    } catch (error: any) {
      // The error from the sheet service is already descriptive.
      // We pass its message along.
      console.error("Failed to update settings:", error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred while saving settings.',
      };
    }
  }
);
