import { scrapeWithCheerio } from '../libs/scrapers/webScraper';

async function testScraper() {
	// Test with React documentation
	const url = 'https://react.dev/learn';

	console.log(`\n🔍 Testing scraper with: ${url}\n`);

	const result = await scrapeWithCheerio(url);

	if (result) {
		console.log('✅ Scraping successful!\n');
		console.log('📄 TITLE:', result.title);
		console.log('\n📊 METADATA:', JSON.stringify(result.metadata, null, 2));
		console.log('\n📝 CONTENT LENGTH:', result.content.length, 'characters');
		console.log('\n📖 CONTENT PREVIEW (first 500 chars):');
		console.log('─'.repeat(80));
		console.log(result.content.substring(0, 500));
		console.log('─'.repeat(80));
		console.log('\n📖 CONTENT PREVIEW (middle 500 chars):');
		console.log('─'.repeat(80));
		const midPoint = Math.floor(result.content.length / 2);
		console.log(result.content.substring(midPoint, midPoint + 500));
		console.log('─'.repeat(80));
		console.log('\n📖 CONTENT PREVIEW (last 500 chars):');
		console.log('─'.repeat(80));
		console.log(result.content.substring(result.content.length - 500));
		console.log('─'.repeat(80));
	} else {
		console.log('❌ Scraping failed - no content returned');
	}
}

testScraper();
