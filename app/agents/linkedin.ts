import { AgentRequest, AgentResponse } from './types';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function linkedInAgent(
	_request: AgentRequest
): Promise<AgentResponse> {
	// TODO: Step 1 - Get the fine-tuned model ID
	// Access process.env.OPENAI_FINETUNED_MODEL
	// If not configured, throw an error

	// TODO: Step 2 - Build the system prompt
	// Include instructions for the LinkedIn agent
	// Add the original user request and refined query for context
	// Tell the model to use the refined query to understand intent

	// TODO: Step 3 - Stream the response
	// Use streamText() from 'ai' package
	// Pass the fine-tuned model using openai()
	// Include the system prompt and conversation messages
	// Return the stream

	throw new Error('LinkedIn agent not implemented');
}
