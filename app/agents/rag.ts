import { AgentRequest, AgentResponse } from './types';
import { openaiClient } from '@/app/libs/openai/openai';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { qdrantClient } from '../libs/qdrant';
import { cohereClient } from '../libs/cohere';

export async function ragAgent(request: AgentRequest): Promise<AgentResponse> {
	const { query } = request;

	// Helper function to create rejection response for out-of-scope queries
	const createRejectionResponse = (): AgentResponse => {
		return streamText({
			model: openai('gpt-4o-mini'),
			messages: [
				{
					role: 'system',
					content:
						'You are a helpful assistant that explains when queries are out of scope.',
				},
				{
					role: 'user',
					content: `I cannot help with that query. This application is designed to help you compose LinkedIn posts and articles based on the available knowledge base (Brian's Medium articles and LinkedIn posts). Your query "${query}" doesn't match the content in our knowledge base. Please try asking me to create a LinkedIn post or article about topics covered in the available documents, such as software engineering, coding bootcamps, JavaScript, React, career advice, technical interviews, or related professional development topics.`,
				},
			],
		}) as AgentResponse;
	};

	const embedding = await openaiClient.embeddings.create({
		model: 'text-embedding-3-small',
		dimensions: 512,
		input: query,
	});

	const linkedInPosts = await qdrantClient.search('linkedin', {
		vector: embedding.data[0].embedding,
		limit: 10,
		with_payload: true,
	});

	const articles = await qdrantClient.search('articles', {
		vector: embedding.data[0].embedding,
		limit: 10,
		with_payload: true,
	});

	// Guardrail 1: Check if we have relevant documents based on similarity scores
	const topLinkedInScore = linkedInPosts[0]?.score ?? 0;
	const topArticleScore = articles[0]?.score ?? 0;
	const maxScore = Math.max(topLinkedInScore, topArticleScore);

	// Log scores for debugging
	console.log('Checking scores:', {
		query,
		linkedInCount: linkedInPosts.length,
		articlesCount: articles.length,
		topLinkedInScore,
		topArticleScore,
		maxScore,
		allLinkedInScores: linkedInPosts.slice(0, 3).map(r => r.score),
		allArticleScores: articles.slice(0, 3).map(r => r.score),
	});

	// Reject if both collections are empty
	if (linkedInPosts.length === 0 && articles.length === 0) {
		console.log('[Guardrail - Similarity Threshold] Request rejected: Both collections empty');
		return createRejectionResponse();
	}

	// Cosine similarity threshold: reject if max score < 0.6
	// Scores below 0.6 indicate low semantic similarity (irrelevant queries)
	const similarityThreshold = 0.6;
	if (maxScore < similarityThreshold) {
		console.log('[Guardrail 1] Request rejected:', {
			query,
			reason: 'Similarity score too low',
			maxScore,
			threshold: similarityThreshold,
		});
		return createRejectionResponse();
	}

	const rerankedDocuments = await cohereClient.rerank({
		model: 'rerank-english-v3.0',
		query: query,
		documents: [
			...linkedInPosts.map((post) => post.payload?.content as string),
			...articles.map((article) => article.payload?.content as string),
		],
		topN: 10,
		returnDocuments: true,
	});

	// Guardrail 2: Check reranked relevance scores from Cohere
	const minRerankThreshold = 0.1;
	const topRerankScore =
		rerankedDocuments.results[0]?.relevanceScore || 0;

	if (topRerankScore < minRerankThreshold && rerankedDocuments.results.length > 0) {
		console.log('[Guardrail Rerank Threshold] Request rejected:', {
			query,
			reason: 'Rerank score too low',
			topRerankScore,
			threshold: minRerankThreshold,
			resultsCount: rerankedDocuments.results.length,
		});
		return createRejectionResponse();
	}

	// we want to generate a linkedin post based on a user query
	return streamText({
		model: openai('gpt-5'),
		messages: [
			{
				role: 'system',
				content: `
				Generate a LinkedIn post based on a user query.
				Use the style, tone and experiences from these documents to generate the post.
				Documents: ${JSON.stringify(
					rerankedDocuments.results.map(
						(result) => result.document?.text
					),
					null,
					2
				)}
				`,
			},
			{
				role: 'user',
				content: query,
			},
		],
		temperature: 0.8,
	});
}
