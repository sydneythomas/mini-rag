/**
 * Script to add missing words to the embeddings cache
 */

import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing OpenAI client
const rootDir = path.resolve(__dirname, '../..');
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');

if (fs.existsSync(envLocalPath)) {
	dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

// Import OpenAI directly instead of using the shared client
import OpenAI from 'openai';

const openaiClient = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY as string,
});

async function addWordsToCache(words: string[]) {
	const cachePath = path.join(rootDir, 'embeddings-cache.json');

	// Load existing cache
	let cache: Record<string, number[]> = {};
	if (fs.existsSync(cachePath)) {
		cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
		console.log(`✅ Loaded ${Object.keys(cache).length} existing embeddings from cache`);
	}

	// Add missing words
	for (const word of words) {
		if (cache[word]) {
			console.log(`⏭️  "${word}" already in cache, skipping`);
			continue;
		}

		console.log(`📥 Fetching embedding for "${word}"...`);
		const response = await openaiClient.embeddings.create({
			model: 'text-embedding-3-small',
			dimensions: 512,
			input: word,
		});

		cache[word] = response.data[0].embedding;
		console.log(`✅ Added "${word}" to cache`);
	}

	// Save updated cache
	fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
	console.log(`\n💾 Saved ${Object.keys(cache).length} total embeddings to cache`);
}

const wordsToAdd = [
	'pizza',
	'accountant',
	'banana',
	'library',
	'sunshine',
	'broccoli',
];

addWordsToCache(wordsToAdd).catch(console.error);
