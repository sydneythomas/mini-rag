import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/libs/openai/openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { agentTypeSchema, messageSchema } from '@/app/agents/types';
import { agentConfigs } from '@/app/agents/config';

const selectAgentSchema = z.object({
	messages: z.array(messageSchema).min(1),
});

const agentSelectionSchema = z.object({
	agent: agentTypeSchema,
	query: z.string(),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const parsed = selectAgentSchema.parse(body);
		const { messages } = parsed;

		// Take last 5 messages for context
		const recentMessages = messages.slice(-5);

		// Build agent descriptions from config
		const agentDescriptions = Object.entries(agentConfigs)
			.map(([key, config]) => `- "${key}": ${config.description}`)
			.join('\n');

		// TODO: Step 1 - Call OpenAI with structured output
		// Use openaiClient.responses.parse()
		// Model: 'gpt-4o-mini'
		// Input: array of messages with:
		//   - System message explaining you're an agent router
		//   - Include agentDescriptions in the system message
		//   - ...recentMessages (spread the user's messages)
		// Text format: use zodTextFormat(agentSelectionSchema, 'agentSelection')

		// TODO: Step 2 - Extract the parsed output
		// The response has an output_parsed field
		// This will contain { agent, query }

		// TODO: Step 3 - Return the result
		// If output has both agent and query, return them
		// Otherwise, return a fallback: { agent: 'rag', query: last message content }

		throw new Error('Selector not implemented yet!');
	} catch (error) {
		console.error('Error selecting agent:', error);
		return NextResponse.json(
			{ error: 'Failed to select agent' },
			{ status: 500 }
		);
	}
}
