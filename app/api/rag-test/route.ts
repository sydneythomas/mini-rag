import { openaiClient } from '@/app/libs/openai/openai';
import { searchDocuments } from '@/app/libs/pinecone';
import { qdrantClient } from '@/app/libs/qdrant';
import { JsonToSseTransformStream } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { query, topK } = body;

	// take the top 10 results from search/query and return them

	// generate the embedding for the query
	const queryEmbedding = await openaiClient.embeddings.create({
		model: 'text-embedding-3-small',
		dimensions: 512,
		input: query,
	});

	const results = await qdrantClient.search('articles', {
		vector: queryEmbedding.data[0].embedding,
		limit: topK,
		with_payload: true,
	});

	console.log(JSON.stringify(results, null, 2))



	// const results = await searchDocuments(query, topK);

	// const formattedResults = results.map((doc) => ({
	// 	id: doc.id,
	// 	score: doc.score,
	// 	content: doc.metadata?.text || '',
	// 	source: doc.metadata?.source || 'unknown',
	// 	chunkIndex: doc.metadata?.chunkIndex,
	// 	totalChunks: doc.metadata?.totalChunks,
	// }));

	// return NextResponse.json({
	// 	query,
	// 	resultsCount: formattedResults.length,
	// 	results: formattedResults,
	// });
}
