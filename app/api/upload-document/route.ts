import { NextRequest, NextResponse } from 'next/server';
import { chunkText } from '@/app/libs/chunking';
import { openaiClient } from '@/app/libs/openai/openai';
import { qdrantClient } from '@/app/libs/qdrant';
import { z } from 'zod';

const uploadTextSchema = z.object({
	type: z.enum(['post', 'article']),
	text: z.string().min(50),
	url: z.string().url().optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		// TODO: Step 1 - Parse and validate the request body
		// Use uploadTextSchema.parse() to validate the incoming request
		// Extract 'text' and optional 'title' from the parsed body
		const { type, text, url, metadata } = uploadTextSchema.parse(body);

		if (type === 'post') {
			const embeddings = await openaiClient.embeddings.create({
				model: 'text-embedding-3-small',
				dimensions: 512,
				input: text,
			});

			await qdrantClient.upsert('linkedin', {
				wait: true,
				points: [
					{
						id: crypto.randomUUID(),
						vector: embeddings.data[0].embedding,
						payload: {
							content: text,
							url: url,
							contentType: 'linkedin',
							...(metadata && { ...metadata }),
						},
					},
				],
			});

			return NextResponse.json(
				{
					success: true,
					message: 'Post uploaded successfully',
				},
				{ status: 200 }
			);
		} else {
			const chunks = chunkText(text, 500, 50, url || 'user-upload');
			for (const chunk of chunks) {
				const embeddings = await openaiClient.embeddings.create({
					model: 'text-embedding-3-small',
					dimensions: 512,
					input: chunk.content,
				});
				await qdrantClient.upsert(type, {
					wait: true,
					points: [
						{
							id: chunk.id,
							vector: embeddings.data[0].embedding,
							payload: {
								...chunk.metadata,
								content: chunk.content,
							},
						},
					],
				});
			}

			const vectors = chunks.map((chunk) => ({
				id: chunk.id,
				vector: embeddings.data[chunk.metadata.chunkIndex].embedding,
				payload: {
					...chunk.metadata,
					content: chunk.content,
				},
			}));

			// upload the vectors to qdrant
			await qdrantClient.upsert(type, {
				points: vectors,
			});
		}

		throw new Error('Upload document not implemented yet!');
	} catch (error) {
		console.error('Error uploading document:', error);
		return NextResponse.json(
			{
				error: 'Failed to upload document',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}