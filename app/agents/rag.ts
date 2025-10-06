import { AgentRequest, AgentResponse } from './types';
import { pineconeClient } from '@/app/libs/pinecone';
import { openaiClient } from '@/app/libs/openai/openai';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function ragAgent(_request: AgentRequest): Promise<AgentResponse> {
	// TODO: Step 1 - Generate embedding for the refined query
	// Use openaiClient.embeddings.create() with model 'text-embedding-3-small'
	// Input should be request.query

	// TODO: Step 2 - Query Pinecone for similar documents
	// Get the index using pineconeClient.Index()
	// Query with the embedding vector
	// Set topK to 5 to get top 5 results
	// Include metadata but not values

	// TODO: Step 3 - Extract the text content from results
	// Map over queryResponse.matches
	// Get the 'text' field from each match's metadata
	// Join all text chunks with double newlines

	// TODO: Step 4 - Build the system prompt with context
	// Include both the original and refined queries
	// Add the retrieved context
	// Instruct the model to use the context to answer

	// TODO: Step 5 - Stream the response
	// Use streamText() with model 'gpt-4o'
	// Pass the system prompt and conversation messages
	// Return the stream

	throw new Error('RAG agent not implemented');
}
