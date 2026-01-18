export type Chunk = {
	id: string;
	content: string;
	metadata: {
		source: string;
		chunkIndex: number;
		totalChunks: number;
		startChar: number;
		endChar: number;
		[key: string]: string | number | boolean | string[];
	};
};

// TODO: Define LinkedInPost type
// Should have: text (string), date (string), url (string), likes (number)
export type LinkedInPost = {
	// YOUR CODE HERE
};

// TODO: Define MediumArticle type
// Should have: title (string), text (string), date (string), url (string)
export type MediumArticle = {
	title: string;
	text: string;
	date: string;
	url: string;
	author: string;
	source: string;
	language: string;
};

/**
 * Splits text into smaller chunks for processing
 * @param text The text to chunk
 * @param chunkSize Maximum size of each chunk
 * @param overlap Number of characters to overlap between chunks
 * @param source Source identifier (typically URL)
 * @returns Array of text chunks
 */
export function chunkText(
	text: string,
	chunkSize: number = 500,
	overlap: number = 50,
	source: string = 'unknown'
): Chunk[] {
	const chunks: Chunk[] = [];
	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

	let currentChunk = '';
	let chunkStart = 0;
	let chunkIndex = 0;

	for (let i = 0; i < sentences.length; i++) {
		const sentence = sentences[i].trim() + '.';

		// If adding this sentence would exceed chunk size, create a chunk
		if (
			currentChunk.length + sentence.length > chunkSize &&
			currentChunk.length > 0
		) {
			const chunk: Chunk = {
				id: `${source}-chunk-${chunkIndex}`,
				content: currentChunk.trim(),
				metadata: {
					source,
					chunkIndex,
					totalChunks: 0, // Will be updated later
					startChar: chunkStart,
					endChar: chunkStart + currentChunk.length,
				},
			};

			chunks.push(chunk);

			// Start new chunk with overlap
			const overlapText = getLastWords(currentChunk, overlap);
			currentChunk = overlapText + ' ' + sentence;
			chunkStart = chunk.metadata.endChar - overlapText.length;
			chunkIndex++;
		} else {
			currentChunk += (currentChunk ? ' ' : '') + sentence;
		}
	}

	// Add final chunk if it has content
	if (currentChunk.trim()) {
		chunks.push({
			id: `${source}-chunk-${chunkIndex}`,
			content: currentChunk.trim(),
			metadata: {
				source,
				chunkIndex,
				totalChunks: 0,
				startChar: chunkStart,
				endChar: chunkStart + currentChunk.length,
			},
		});
	}

	// Update total chunks count
	chunks.forEach((chunk) => {
		chunk.metadata.totalChunks = chunks.length;
	});

	return chunks;
}

/**
 * Gets the last N characters worth of words from a text
 *
 * This is used to create overlap between chunks. We want complete words,
 * not cut-off characters, so we work backwards from the end.
 *
 * @param text The source text
 * @param maxLength Maximum length to return
 * @returns The last words up to maxLength
 *
 * @example
 * getLastWords("React Hooks are awesome", 10)
 * // Returns: "are awesome" (10 chars)
 * // NOT: "re awesome" (cut off "are")
 *

 *
 * Requirements:
 * 1. If text is shorter than maxLength, return the whole text
 * 2. Otherwise, return the last maxLength characters worth of COMPLETE words
 * 3. Build the result backwards to ensure you get the last words
 *
 * Steps:
 * 1. Check if text.length <= maxLength, if so return text
 * 2. Split text into words using .split(' ')
 * 3. Start with empty result string
 * 4. Loop through words BACKWARDS (from end to start)
 * 5. For each word, check if adding it would exceed maxLength
 * 6. If it would exceed, break the loop
 * 7. Otherwise, prepend the word to result (word + ' ' + result)
 * 8. Return the result
 */
function getLastWords(text: string, maxLength: number): string {
	// Step 1: Check if text.length <= maxLength, if so return text
	if (text.length <= maxLength) {
		return text;
	}

	// Step 2: Split text into words using .split(' ')
	const words = text.split(' ');

	// Step 3: Start with empty result string
	let result = '';

	// Step 4: Loop through words BACKWARDS (from end to start)
	for (let i = words.length - 1; i >= 0; i--) {
		const word = words[i];

		// Step 5: For each word, check if adding it would exceed maxLength
		// Account for: word length + space (if result is not empty) + current result length
		const spaceLength = result.length > 0 ? 1 : 0;
		const newLength = word.length + spaceLength + result.length;

		// Step 6: If it would exceed, break the loop
		if (newLength > maxLength) {
			break;
		}

		// Step 7: Otherwise, prepend the word to result (word + ' ' + result)
		result = result.length > 0 ? word + ' ' + result : word;
	}

	// Step 8: Return the result
	return result;
}

/**
 * TODO: Implement extractLinkedInPosts function
 *
 * This function should extract LinkedIn posts from CSV data.
 *
 * @param csvContent The CSV file content as a string
 * @returns Array of LinkedInPost objects with text, date, url, and likes
 *
 * Requirements:
 * 1. Parse the CSV header to find column indices for:
 *    - text: the post content
 *    - createdAt (TZ=America/Los_Angeles): the date
 *    - link: the URL
 *    - numReactions: the number of likes
 *
 * 2. Handle CSV parsing properly:
 *    - Fields can be quoted with double quotes
 *    - Quoted fields can contain commas
 *    - Use a simple parser or handle quoted fields manually
 *
 * 3. Skip the header row and process each data row
 *
 * 4. Return an array of LinkedInPost objects
 *
 * Hints:
 * - Split by newlines to get rows
 * - For each row, carefully parse considering quoted fields
 * - Extract the values at the correct column indices
 * - Convert numReactions to a number using parseInt()
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function extractLinkedInPosts(_csvContent: string): LinkedInPost[] {
	// TODO: Implement this function!
	// YOUR CODE HERE
	// Remove the underscore from _csvContent when you start implementing

	// Placeholder return - replace with your implementation
	throw new Error('extractLinkedInPosts not implemented yet!');
}

/**
 * TODO: Implement extractMediumArticle function
 *
 * This function should extract a Medium article from HTML content.
 *
 * @param htmlContent The HTML file content as a string
 * @returns MediumArticle object with title, text, date, and url (or null if extraction fails)
 *
 * Requirements:
 * 1. Extract the title from the <title> tag
 *    - Use regex: /<title>(.*?)<\/title>/
 *
 * 2. Extract the date from the <time> tag's datetime attribute
 *    - Look for: <time class="dt-published" datetime="...">
 *    - Use regex to capture the datetime value
 *
 * 3. Extract the URL from the canonical link
 *    - Look for: <a href="..." class="p-canonical">
 *    - Should be a medium.com URL
 *
 * 4. Extract the text content from the body section
 *    - Find: <section data-field="body" class="e-content">...</section>
 *    - Remove all HTML tags but keep the text
 *    - Clean up whitespace (replace multiple spaces with single space)
 *    - Trim the result
 *
 * 5. Return null if extraction fails (use try/catch)
 *
 * Hints:
 * - Use .match() with regex to extract values
 * - Use .replace() to remove HTML tags: /<[^>]+>/g
 * - Use .replace(/\s+/g, ' ') to normalize whitespace
 * - Use try/catch to handle errors and return null
 */
export function extractMediumArticle(
	htmlContent: string
): MediumArticle | null {
	try {
		// Step 1: Extract the title from the <title> tag
		const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
		if (!titleMatch || !titleMatch[1]) {
			return null;
		}
		const title = titleMatch[1].trim();

		// Step 2: Extract the date from the <time> tag's datetime attribute
		const dateMatch = htmlContent.match(
			/<time[^>]*class="dt-published"[^>]*datetime="([^"]+)"/
		);
		if (!dateMatch || !dateMatch[1]) {
			return null;
		}
		const date = dateMatch[1].trim();

		// Step 3: Extract the URL from the canonical link
		const urlMatch = htmlContent.match(
			/<a[^>]*href="([^"]+)"[^>]*class="p-canonical"/
		);
		if (!urlMatch || !urlMatch[1]) {
			return null;
		}
		const url = urlMatch[1].trim();

		// Step 4: Extract the text content from the body section
		// Find the opening tag
		const bodyStartMatch = htmlContent.match(
			/<section[^>]*data-field="body"[^>]*class="e-content"[^>]*>/
		);
		if (!bodyStartMatch || !bodyStartMatch.index) {
			return null;
		}

		// Find the content starting after the opening tag
		const startPos = bodyStartMatch.index + bodyStartMatch[0].length;
		let depth = 1;
		let pos = startPos;

		// Find the matching closing </section> tag by counting opening/closing tags
		while (pos < htmlContent.length && depth > 0) {
			const nextOpen = htmlContent.indexOf('<section', pos);
			const nextClose = htmlContent.indexOf('</section>', pos);

			if (nextClose === -1) {
				return null; // No closing tag found
			}

			if (nextOpen !== -1 && nextOpen < nextClose) {
				depth++;
				pos = nextOpen + 8; // Move past '<section'
			} else {
				depth--;
				if (depth === 0) {
					// Found the matching closing tag
					break;
				}
				pos = nextClose + 10; // Move past '</section>'
			}
		}

		if (depth !== 0) {
			return null; // Couldn't find matching closing tag
		}

		let text = htmlContent.substring(startPos, pos);

		// Remove all HTML tags but keep the text
		text = text.replace(/<[^>]+>/g, '');

		// Decode HTML entities (basic ones)
		text = text
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, ' ');

		// Clean up whitespace (replace multiple spaces/newlines with single space)
		text = text.replace(/\s+/g, ' ');

		// Trim the result
		text = text.trim();

		// Step 5: Extract the author from the footer
		// Look for <a> tag with class containing "p-author"
		const authorMatch = htmlContent.match(
			/<a[^>]*class="[^"]*p-author[^"]*"[^>]*>([^<]+)<\/a>/
		);
		const author = authorMatch && authorMatch[1] ? authorMatch[1].trim() : '';

		// Step 6: Extract language (check html lang attribute or meta tag, default to 'en')
		let language = 'en'; // Default to English
		const htmlLangMatch = htmlContent.match(/<html[^>]*lang="([^"]+)"/i);
		if (htmlLangMatch && htmlLangMatch[1]) {
			language = htmlLangMatch[1].trim();
		} else {
			// Check for meta http-equiv content-language
			const metaLangMatch = htmlContent.match(
				/<meta[^>]*http-equiv=["']content-language["'][^>]*content=["']([^"']+)["']/i
			);
			if (metaLangMatch && metaLangMatch[1]) {
				language = metaLangMatch[1].trim();
			}
		}

		// Validate that we have all required fields
		if (!title || !text || !date || !url) {
			return null;
		}

		return {
			title,
			text,
			date,
			url,
			author,
			source: 'medium',
			language,
		};
	} catch {
		// Step 5: Return null if extraction fails
		return null;
	}
}