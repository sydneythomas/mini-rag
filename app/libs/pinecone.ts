/**
 * PINECONE VECTOR DATABASE INTEGRATION
 *
 * This file handles interactions with Pinecone, a managed vector database service.
 *
 * WHAT IS A VECTOR DATABASE?
 * Vector databases store high-dimensional numerical representations (embeddings) of data.
 * Unlike traditional databases that store exact text/numbers, vector DBs store "meanings"
 * as mathematical vectors. This enables semantic search - finding content by meaning
 * rather than exact keyword matches.
 *
 *
 * Learn more: https://docs.pinecone.io/docs/overview
 *
 * EXPERIMENT: Try changing the embedding model or topK values below!
 */

import {
	Pinecone,
	RecordMetadata,
	ScoredPineconeRecord,
} from '@pinecone-database/pinecone';
import { openaiClient } from '../libs/openai/openai';

// Initialize Pinecone client with your API key
// Get your free API key at: https://app.pinecone.io/
export const pineconeClient = new Pinecone({
	apiKey: process.env.PINECONE_API_KEY as string,
});

/**
 * Searches for semantically similar documents in the vector database
 *
 * @param query - The search query (will be converted to embeddings)
 * @param topK - Number of most similar results to return (try 3-10)
 * @returns Array of matching documents with similarity scores
 */
export const searchDocuments = async (
	query: string,
	topK: number = 3
): Promise<ScoredPineconeRecord<RecordMetadata>[]> => {
	// TODO: Step 1 - Connect to the Pinecone index
	// Use pineconeClient.Index() with process.env.PINECONE_INDEX
	// Example: const index = pineconeClient.Index(process.env.PINECONE_INDEX!)

	// TODO: Step 2 - Generate query embedding using OpenAI
	// Use openaiClient.embeddings.create()
	// Parameters:
	//   - model: 'text-embedding-3-small'
	//   - dimensions: 512
	//   - input: query

	// TODO: Step 3 - Extract the embedding array from the response
	// The embedding is at: embeddingResponse.data[0].embedding

	// TODO: Step 4 - Query Pinecone for similar vectors
	// Use index.query() with:
	//   - vector: the embedding from step 3
	//   - topK: the topK parameter passed to this function
	//   - includeMetadata: true (to get the original text back)

	// TODO: Step 5 - Return the matches
	// Return docs.matches from the query response

	throw new Error('searchDocuments not implemented yet!');
};
