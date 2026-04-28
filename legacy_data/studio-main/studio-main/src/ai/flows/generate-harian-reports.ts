// This file uses server-side code.
'use server';

/**
 * @fileOverview Generates simple harian reports with concise summaries.
 *
 * - generateHarianReports - A function that generates a concise report summary.
 * - GenerateHarianReportsInput - The input type for the generateHarianReports function.
 * - GenerateHarianReportsOutput - The return type for the generateHarianReports function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHarianReportsInputSchema = z.object({
  dailyRedemptions: z.string().describe('The daily redemptions data.'),
  doExpenses: z.string().describe('The daily DO expenses data.'),
  distributionsInTons: z.string().describe('The daily distributions data in tons.'),
});

export type GenerateHarianReportsInput = z.infer<typeof GenerateHarianReportsInputSchema>;

const GenerateHarianReportsOutputSchema = z.object({
  reportSummary: z.string().describe('A concise summary of the daily report.'),
});

export type GenerateHarianReportsOutput = z.infer<typeof GenerateHarianReportsOutputSchema>;

export async function generateHarianReports(input: GenerateHarianReportsInput): Promise<GenerateHarianReportsOutput> {
  return generateHarianReportsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHarianReportsPrompt',
  input: {schema: GenerateHarianReportsInputSchema},
  output: {schema: GenerateHarianReportsOutputSchema},
  prompt: `You are an expert in generating concise daily reports.  Based on the following information about redemptions, expenses, and distributions, generate a short summary:

Daily Redemptions: {{{dailyRedemptions}}}
DO Expenses: {{{doExpenses}}}
Distributions in Tons: {{{distributionsInTons}}}

Summary:`, // Specify output is a short summary here.
});

const generateHarianReportsFlow = ai.defineFlow(
  {
    name: 'generateHarianReportsFlow',
    inputSchema: GenerateHarianReportsInputSchema,
    outputSchema: GenerateHarianReportsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
