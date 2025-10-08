import { NextRequest, NextResponse } from 'next/server';
import { DataProcessor } from '@/app/libs/dataProcessor';
import { openaiClient } from '@/app/libs/openai/openai';
import { pineconeClient } from '@/app/libs/pinecone';
import { z } from 'zod';

const uploadDocumentSchema = z.object({
	urls: z.array(z.string().url()).min(1),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		// TODO: Step 1 - Parse and validate the request body
		// Use uploadDocumentSchema.parse() to validate the incoming request
		// Extract the 'urls' array from the parsed body
		const parsed = uploadDocumentSchema.parse(body);
		const { urls } = parsed;

		// TODO: Step 2 - Scrape and chunk the content
		// Create a new DataProcessor instance
		// Use processor.processUrls() to scrape and chunk the URLs
		// This returns an array of text chunks with metadata
		const processor = new DataProcessor();
		const chunks = await processor.processUrls(urls);

		// TODO: Step 3 - Check if we got any content
		// If chunks.length === 0, return an error response
		// Status should be 400 with appropriate error message
		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: 'No content found to process' },
				{ status: 400 }
			);
		}

		// TODO: Step 4 - Get Pinecone index
		// Use pineconeClient.Index() to get your index
		// The index name comes from process.env.PINECONE_INDEX
		const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

		// TODO: Step 5 - Process chunks in batches
		// Pinecone recommends batching uploads (100 at a time)
		// Loop through chunks in batches
		const batchSize = 100;
		let successCount = 0;
		for (let i = 0; i < chunks.length; i += batchSize) {
			const batch = chunks.slice(i, i + batchSize);

			// TODO: Step 6 - Generate embeddings for each batch
			// Use openaiClient.embeddings.create()
			// Model: 'text-embedding-3-small'
			// Input: array of chunk.content strings
			const embeddingResponse = await openaiClient.embeddings.create({
				model: 'text-embedding-3-small',
				dimensions: 512,
				input: batch.map((chunk) => chunk.content),
			});
			const vectors = batch.map((chunk, idx) => ({
				id: chunk.id,
				values: embeddingResponse.data[idx].embedding,
				metadata: chunk.metadata,
			}));
			await index.upsert(vectors);
			successCount += batch.length;
		}

		// TODO: Step 7 - Prepare vectors for Pinecone
		// Map each chunk to a vector object with:
		// - id: unique identifier (e.g., url + chunkIndex)
		// - values: the embedding array
		// - metadata: { text, url, title, chunkIndex, totalChunks }

		// TODO: Step 8 - Upload to Pinecone
		// Use index.upsert() to upload the batch
		// Track successful uploads

		// TODO: Step 9 - Return success response
		// Return JSON with success status and counts

		return NextResponse.json(
			{
				success: true,
				chunksProcessed: chunks.length,
				vectorsUploaded: successCount,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error uploading documents:', error);
		return NextResponse.json(
			{ error: 'Failed to upload documents' },
			{ status: 500 }
		);
	}
}
