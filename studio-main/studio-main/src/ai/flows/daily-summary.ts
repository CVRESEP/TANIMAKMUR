'use server';
/**
 * @fileOverview Generates a daily summary of redemptions, DO expenses, and distributions in tons.
 *
 * - generateDailySummary - A function that generates the daily summary.
 * - DailySummaryInput - The input type for the generateDailySummary function.
 * - DailySummaryOutput - The return type for the generateDailySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailySummaryInputSchema = z.object({
  redemptions: z.number().describe('Total redemptions for the day.'),
  doExpenses: z.number().describe('Total DO (Delivery Order) expenses for the day.'),
  distributions: z.number().describe('Total distributions in tons for the day.'),
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

const DailySummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the daily redemptions, DO expenses, and distributions, highlighting key trends and patterns.'),
});
export type DailySummaryOutput = z.infer<typeof DailySummaryOutputSchema>;

export async function generateDailySummary(input: DailySummaryInput): Promise<DailySummaryOutput> {
  return dailySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailySummaryPrompt',
  input: {schema: DailySummaryInputSchema},
  output: {schema: DailySummaryOutputSchema},
  prompt: `You are an AI assistant that specializes in summarizing daily operational data.

  Generate a concise summary (about 100 words) of the following data, highlighting any key trends and patterns.

  Redemptions: {{redemptions}}
  DO Expenses: {{doExpenses}}
  Distributions (tons): {{distributions}}

  Focus on identifying relationships between these metrics and suggesting potential areas for investigation or optimization.
`,
});

const dailySummaryFlow = ai.defineFlow(
  {
    name: 'dailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
