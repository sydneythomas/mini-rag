import { NextRequest, NextResponse } from 'next/server';
import { openaiClient } from '@/app/libs/openai/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
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

		// TODO: Call OpenAI to determine which agent should handle the request
		// Hint: Use openaiClient.chat.completions.create()
		// Model: 'gpt-4o-mini'
		// System prompt should:
		//   - Explain you're an agent router
		//   - List available agents with descriptions
		//   - Ask for response format: "AGENT: [agent_name]\nQUERY: [refined_query]"
		// Include recentMessages as context

		// TODO: Parse the text response
		// The response will be in format:
		// "AGENT: rag\nQUERY: How to use useState in React"
		// Extract the agent and query from this text

		// TODO: Validate the agent is valid (exists in agentConfigs)
		// If not valid, default to 'rag'

		// TODO: Return the result
		// Return NextResponse.json({ agent, query })

		// Temporary response for students to replace
		return NextResponse.json({
			agent: 'rag',
			query: messages[messages.length - 1]?.content || '',
		});
	} catch (error) {
		console.error('Error selecting agent:', error);
		return NextResponse.json(
			{ error: 'Failed to select agent' },
			{ status: 500 }
		);
	}
}
