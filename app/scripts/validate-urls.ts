import { scrapeWithCheerio } from '../libs/scrapers/webScraper';

// Curated and validated URLs for RAG system
const urlsToTest = [
	// ===== TOP TIER (20K+ chars) =====
	// React Documentation
	'https://react.dev/learn',
	'https://react.dev/reference/react/useState',
	'https://react.dev/reference/react/useEffect',
	'https://react.dev/learn/thinking-in-react',
	'https://react.dev/learn/describing-the-ui',

	// Next.js Documentation
	'https://nextjs.org/docs/app/building-your-application/routing',
	'https://nextjs.org/docs/app/building-your-application/data-fetching',

	// TypeScript Documentation
	'https://www.typescriptlang.org/docs/handbook/2/basic-types.html',

	// GitHub READMEs (Rich content)
	'https://github.com/pinecone-io/pinecone-ts-client',
	'https://github.com/vercel/ai',

	// ===== SUPPORTING (5K-20K chars) =====
	// Vercel AI SDK (for agents)
	'https://sdk.vercel.ai/docs',
	'https://sdk.vercel.ai/docs/ai-sdk-core/generating-text',

	// More React
	'https://react.dev/reference/react',
	'https://react.dev/learn/state-a-components-memory',
	'https://react.dev/learn/render-and-commit',
	'https://react.dev/reference/react/useContext',
	'https://react.dev/reference/react/useReducer',

	// More Next.js
	'https://nextjs.org/docs',
	'https://nextjs.org/docs/getting-started',
	'https://nextjs.org/docs/app/building-your-application/rendering',

	// More TypeScript
	'https://www.typescriptlang.org/docs/handbook/intro.html',
	'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',

	// More GitHub READMEs
	'https://github.com/vercel/next.js',
	'https://github.com/facebook/react',
];

type TestResult = {
	url: string;
	status: 'success' | 'failed' | 'too_short';
	contentLength?: number;
	title?: string;
	error?: string;
};

async function validateUrls() {
	console.log(`\n🔍 Testing ${urlsToTest.length} URLs...\n`);

	const results: TestResult[] = [];

	for (const url of urlsToTest) {
		try {
			const result = await scrapeWithCheerio(url);

			if (result) {
				results.push({
					url,
					status: 'success',
					contentLength: result.content.length,
					title: result.title,
				});
				console.log(`✅ ${url}`);
				console.log(
					`   ${result.title} (${result.content.length} chars)\n`
				);
			} else {
				results.push({
					url,
					status: 'too_short',
					error: 'Content too short (< 100 chars)',
				});
				console.log(`⚠️  ${url}`);
				console.log(`   Content too short\n`);
			}
		} catch (error) {
			results.push({
				url,
				status: 'failed',
				error: error instanceof Error ? error.message : String(error),
			});
			console.log(`❌ ${url}`);
			console.log(`   Error: ${error}\n`);
		}

		// Add small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	// Summary
	console.log('\n' + '='.repeat(80));
	console.log('📊 SUMMARY\n');

	const successful = results.filter((r) => r.status === 'success');
	const failed = results.filter((r) => r.status === 'failed');
	const tooShort = results.filter((r) => r.status === 'too_short');

	console.log(`✅ Successful: ${successful.length}`);
	console.log(`❌ Failed: ${failed.length}`);
	console.log(`⚠️  Too Short: ${tooShort.length}`);
	console.log(`📊 Total: ${results.length}\n`);

	// Show recommended URLs
	console.log('🌟 RECOMMENDED URLs for RAG system:\n');
	const recommended = successful
		.filter((r) => r.contentLength && r.contentLength > 5000)
		.sort((a, b) => (b.contentLength || 0) - (a.contentLength || 0));

	recommended.forEach((r) => {
		console.log(`  ${r.url}`);
		console.log(`    └─ ${r.title} (${r.contentLength?.toLocaleString()} chars)\n`);
	});

	// Show failed URLs
	if (failed.length > 0) {
		console.log('\n❌ FAILED URLs (avoid these):\n');
		failed.forEach((r) => {
			console.log(`  ${r.url}`);
			console.log(`    └─ ${r.error}\n`);
		});
	}

	return results;
}

validateUrls();
