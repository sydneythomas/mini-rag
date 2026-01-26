/**
 * Article Upload Script
 *
 * This script processes Medium articles and LinkedIn posts from the data directory,
 * chunks them using the chunking utilities, and prepares them for upload to Qdrant.
 *
 * WORKFLOW:
 * 1. Read all Medium article HTML files from data/articles/
 * 2. Parse them using extractMediumArticle
 * 3. Read LinkedIn posts from data/brian_posts.csv
 * 4. Parse them using extractLinkedInPosts
 * 5. Chunk all content using chunkText
 * 6. Upload to Qdrant (TODO)
 *
 * USAGE:
 * Run: npx tsx app/scripts/upload-articles.ts
 */
import dotenv from 'dotenv';
dotenv.config()
import fs from 'fs';
import path from 'path';
import { v5 as uuidv5 } from 'uuid';
import {
    extractMediumArticle,
    extractLinkedInPosts,
    chunkText,
    type Chunk,
} from '../libs/chunking';
import { openaiClient } from '../libs/openai/openai';
import { qdrantClient } from '../libs/qdrant';

// Create a namespace UUID for deterministic UUID generation
// This can be any fixed UUID - we'll use a standard namespace UUID
const CHUNK_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard namespace UUID

// Helper function to convert chunk ID to deterministic UUID
// This ensures the same chunk ID always produces the same UUID for deduplication
function chunkIdToUUID(chunkId: string): string {
    return uuidv5(chunkId, CHUNK_NAMESPACE);
}



const DATA_DIR = path.join(process.cwd(), 'app/scripts/data');
const ARTICLES_DIR = path.join(DATA_DIR, 'articles');
const LINKEDIN_CSV = path.join(DATA_DIR, 'brian_posts.csv');

/**
 * Processes all Medium articles from the articles directory
 */
async function processMediumArticles(): Promise<Chunk[]> {
    console.log('📖 Processing Medium articles...');

    const files = fs
        .readdirSync(ARTICLES_DIR)
        .filter((f) => f.endsWith('.html'));
    console.log(`Found ${files.length} HTML files`);

    const allChunks: Chunk[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
        const filePath = path.join(ARTICLES_DIR, file);
        const htmlContent = fs.readFileSync(filePath, 'utf-8');

        // we want to ignore artciles with less than 500 characters
        if (htmlContent.length < 500) {
            continue;
        }

        const article = extractMediumArticle(htmlContent); // removes HTML tags to clean up the text

        if (article) {
            // Chunk the article text (source is set to article.url)
            const chunks = chunkText(article.text, 500, 50, article.url); // breaks article into chunks of 500 characters with 50 character overlap

            console.log(JSON.stringify(chunks, null, 2));

            // Add article metadata to each chunk
            chunks.forEach((chunk) => {
                chunk.metadata.title = article.title;
                chunk.metadata.author = article.author;
                chunk.metadata.date = article.date;
                chunk.metadata.contentType = article.source; // 'medium'
                chunk.metadata.language = article.language;
            });

            allChunks.push(...chunks);
            successCount++;
        } else {
            console.warn(`⚠️  Failed to parse: ${file}`);
            failCount++;
        }
    }

    console.log(
        `✅ Processed ${successCount} articles, ${failCount} failed, ${allChunks.length} total chunks`
    );
    return allChunks;
}

/**
 * Processes LinkedIn posts from CSV file
 */
async function processLinkedInPosts(): Promise<Chunk[]> {
    console.log('💼 Processing LinkedIn posts...');

    const csvContent = fs.readFileSync(LINKEDIN_CSV, 'utf-8');
    const posts = extractLinkedInPosts(csvContent);

    console.log(`Found ${posts.length} LinkedIn posts`);

    const allChunks: Chunk[] = [];

    for (const post of posts) {
        // Chunk the post text
        const chunks = chunkText(post.text, 500, 50, post.url);

        // Add post metadata to each chunk
        chunks.forEach((chunk) => {
            chunk.metadata.date = post.date;
            chunk.metadata.likes = post.likes;
            chunk.metadata.contentType = 'linkedin';
            chunk.metadata.url = post.url;
        });

        allChunks.push(...chunks);
    }

    console.log(`✅ Created ${allChunks.length} chunks from LinkedIn posts`);
    return allChunks;
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting article processing...\n');

    try {
        // Process Medium articles
        const mediumChunks = await processMediumArticles();

        // Embed and upload Medium articles
        console.log('\n📤 Embedding and uploading Medium articles...');
        let uploadedArticles = 0;
        for (const chunk of mediumChunks) {
            const embeddings = await openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                dimensions: 512,
                input: chunk.content,
            });

            await qdrantClient.upsert('articles', {
                points: [
                    {
                        id: chunkIdToUUID(chunk.id), // Convert to UUID for Qdrant compatibility
                        vector: embeddings.data[0].embedding,
                        payload: {
                            ...chunk.metadata,
                            content: chunk.content,
                            originalChunkId: chunk.id // Store original ID in payload for traceability
                        }
                    },
                ],
            });
            uploadedArticles++;
            if (uploadedArticles % 50 === 0) {
                console.log(`   Uploaded ${uploadedArticles}/${mediumChunks.length} article chunks...`);
            }
        }
        console.log(`✅ Uploaded ${uploadedArticles} article chunks to Qdrant`);

        // Process LinkedIn posts
        const linkedInChunks = await processLinkedInPosts();

        // Embed and upload LinkedIn posts
        console.log('\n📤 Embedding and uploading LinkedIn posts...');
        let uploadedPosts = 0;
        for (const chunk of linkedInChunks) {
            const embeddings = await openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                dimensions: 512,
                input: chunk.content,
            });

            await qdrantClient.upsert('linkedin', {
                points: [
                    {
                        id: chunkIdToUUID(chunk.id), // Convert to UUID for Qdrant compatibility
                        vector: embeddings.data[0].embedding,
                        payload: {
                            ...chunk.metadata,
                            content: chunk.content,
                            originalChunkId: chunk.id // Store original ID in payload for traceability
                        }
                    },
                ],
            });
            uploadedPosts++;
            if (uploadedPosts % 50 === 0) {
                console.log(`   Uploaded ${uploadedPosts}/${linkedInChunks.length} LinkedIn post chunks...`);
            }
        }
        console.log(`✅ Uploaded ${uploadedPosts} LinkedIn post chunks to Qdrant`);

        // Combine all chunks
        const allChunks = [...mediumChunks, ...linkedInChunks];

        console.log(`\n📊 Summary:`);
        console.log(`   Medium chunks: ${mediumChunks.length}`);
        console.log(`   LinkedIn chunks: ${linkedInChunks.length}`);
        console.log(`   Total chunks: ${allChunks.length}`);
        console.log(`   ✅ Uploaded to Qdrant: ${uploadedArticles} articles + ${uploadedPosts} LinkedIn posts`);

        // For now, save to a JSON file for inspection
        const outputPath = path.join(DATA_DIR, 'processed_chunks.json');
        fs.writeFileSync(outputPath, JSON.stringify(allChunks, null, 2));
        console.log(`\n💾 Saved processed chunks to: ${outputPath}`);
    } catch (error) {
        console.error('❌ Error processing articles:', error);
        process.exit(1);
    }
}

main();