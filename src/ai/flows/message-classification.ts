// src/ai/flows/message-classification.ts
'use server';
/**
 * @fileOverview A flow that classifies whether a new message adds information or contradicts existing messages.
 *
 * - classifyMessage - A function that classifies a new message.
 * - MessageClassificationInput - The input type for the classifyMessage function.
 * - MessageClassificationOutput - The return type for the classifyMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageClassificationInputSchema = z.object({
  newMessage: z.string().describe('The new message to classify.'),
  existingMessages: z.array(z.string()).describe('The existing messages on the board.'),
});
export type MessageClassificationInput = z.infer<typeof MessageClassificationInputSchema>;

const MessageClassificationOutputSchema = z.object({
  classification: z.enum(['adds_information', 'contradicts', 'neutral']).describe('The classification of the new message.'),
  reason: z.string().describe('The reason for the classification.'),
});
export type MessageClassificationOutput = z.infer<typeof MessageClassificationOutputSchema>;

export async function classifyMessage(input: MessageClassificationInput): Promise<MessageClassificationOutput> {
  return classifyMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'messageClassificationPrompt',
  input: {schema: MessageClassificationInputSchema},
  output: {schema: MessageClassificationOutputSchema},
  prompt: `You are an AI assistant that classifies whether a new message adds information to existing messages or contradicts them.

Existing Messages:
{{#each existingMessages}}
- {{{this}}}
{{/each}}

New Message: {{{newMessage}}}

Classify the new message as one of the following:
- adds_information: The new message adds new information to the existing messages.
- contradicts: The new message contradicts the existing messages.
- neutral: The new message is neutral or does not add or contradict the existing messages.

Explain your reasoning.

{
  "classification": "<classification>",
  "reason": "<reason>"
}
`,
});

const classifyMessageFlow = ai.defineFlow(
  {
    name: 'classifyMessageFlow',
    inputSchema: MessageClassificationInputSchema,
    outputSchema: MessageClassificationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
