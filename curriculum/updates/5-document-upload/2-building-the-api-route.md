# Building the Document Upload Pipeline

Now that you have Pinecone configured, it's time to fill your vector database with actual content! This is where your RAG system gets its knowledge.

---

## What You'll Build

By the end of this module, you'll have:
- An API route that accepts URLs
- A pipeline that scrapes, chunks, and vectorizes content
- Documents uploaded to Pinecone and ready for retrieval

---

## The Big Picture: The Upload Pipeline

Let's understand the complete flow:

```
URLs from User
    ↓
1. Scrape web content (HTML → text)
    ↓
2. Chunk text into smaller pieces
    ↓
3. Generate embeddings (text → vectors)
    ↓
4. Upload to Pinecone
    ↓
Content Ready for RAG!
```

This is the "write" side of your RAG system. The "read" side (retrieval) comes later.

---

## Why This Pipeline Exists

**Why not just save the whole webpage?**
- Too much context for the LLM (token limits!)
- Harder to find relevant sections
- Less precise retrieval

**Why chunk the content?**
- Smaller chunks = more focused context
- Better retrieval (find exact relevant sections)
- Fits within LLM context windows

**Why batch upload?**
- API rate limits
- More efficient
- Better error handling

---

## Understanding the Pieces

### 1. The DataProcessor

Located at: `app/libs/dataProcessor.ts`

This class handles:
- **Scraping**: Fetching HTML and extracting clean text
- **Chunking**: Breaking text into ~500 character pieces with overlap

```typescript
// How it works (simplified)
const processor = new DataProcessor();
const chunks = await processor.processUrls(['https://example.com']);

// Returns array of chunks:
[
  {
    id: "url-chunk-0",
    content: "First 500 chars of text...",
    metadata: {
      url: "https://example.com",
      title: "Page Title",
      chunkIndex: 0,
      totalChunks: 5
    }
  },
  // ... more chunks
]
```

**Key concept: Overlap**
Chunks overlap by ~50 characters to maintain context at boundaries. This ensures important information isn't split awkwardly.

### 2. OpenAI Embeddings

Embeddings convert text to vectors (arrays of numbers that capture meaning).

```typescript
// What happens under the hood
const response = await openaiClient.embeddings.create({
  model: 'text-embedding-3-small',
  input: ['Hello world', 'Machine learning basics']
});

// Returns:
[
  { embedding: [0.1, -0.3, 0.8, ...] }, // 1536 numbers for "Hello world"
  { embedding: [0.2, 0.1, -0.5, ...] }  // 1536 numbers for "Machine learning"
]
```

**Why 'text-embedding-3-small'?**
- Fast and efficient (512 dimensions instead of 1536)
- Good quality for most use cases
- Lower cost than larger models

### 3. Batching Strategy

Pinecone recommends uploading in batches of 100:

```typescript
// Why batch?
const allChunks = 500; // chunks to upload
const batchSize = 100;

// Without batching: 500 API calls
// With batching: 5 API calls (much faster!)

for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  // Process batch...
}
```

---

## The API Route Structure

Your route lives at: `app/api/upload-document/route.ts`

**What it needs to do:**
1. Validate incoming URLs (Zod schema)
2. Scrape and chunk content
3. Generate embeddings for all chunks
4. Format vectors for Pinecone
5. Upload in batches
6. Return success/failure

**Why an API route?**
- Can be called from the frontend UI
- Can be triggered by scripts
- Keeps business logic separate from UI
- Easy to test independently

---

## Understanding Vector Metadata

When you upload to Pinecone, each vector includes metadata:

```typescript
{
  id: "unique-identifier",
  values: [0.1, -0.3, ...], // The embedding
  metadata: {
    text: "The actual chunk content",
    url: "https://source-url.com",
    title: "Document Title",
    chunkIndex: 0,
    totalChunks: 10
  }
}
```

**Why metadata matters:**
- `text`: What you show to the LLM as context
- `url`: For attribution/sourcing
- `title`: For display to users
- `chunkIndex`: To reconstruct full documents if needed

Pinecone indexes the vector but returns the metadata when querying!

---

## Your Challenge

Open `app/api/upload-document/route.ts` and you'll see 9 TODO steps.

### Implementation Steps

**Step 1: Validate the Request**
```typescript
// Parse the request body
const body = await req.json();

// Validate with Zod
const parsed = uploadDocumentSchema.parse(body);
const { urls } = parsed;
```

**Step 2: Scrape and Chunk**
```typescript
const processor = new DataProcessor();
const chunks = await processor.processUrls(urls);
```

**Step 3-5: Set Up for Upload**
- Check if chunks exist
- Get Pinecone index
- Set up batch processing

**Step 6-7: Generate Embeddings and Format**
For each batch:
- Generate embeddings for all chunk contents
- Map chunks + embeddings to Pinecone vector format

**Step 8-9: Upload and Respond**
- Upload each batch to Pinecone
- Track success count
- Return results

### Hints

**For embeddings:**
```typescript
const embeddingResponse = await openaiClient.embeddings.create({
  model: 'text-embedding-3-small',
  input: batch.map(chunk => chunk.content) // Array of strings
});

// Access embeddings:
embeddingResponse.data[0].embedding // First embedding
embeddingResponse.data[1].embedding // Second embedding
```

**For Pinecone upload:**
```typescript
await index.upsert(vectors);
```

**For creating unique IDs:**
```typescript
// Combine URL and chunk index for uniqueness
const id = `${chunk.metadata.url}-${chunk.metadata.chunkIndex}`;
```

---

## Testing Your Implementation

### Using the Frontend (after you build it)
```
1. Enter URLs in the upload form
2. Click "Upload"
3. Check the response for success message
```

### Using curl
```bash
curl -X POST http://localhost:3000/api/upload-document \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://react.dev/learn",
      "https://nextjs.org/docs"
    ]
  }'
```

### Verifying in Pinecone Console
1. Go to your Pinecone index
2. Check "Vectors" tab - should see new entries
3. Try the "Query" feature - search for test content

---

## Common Issues & Solutions

### "Dimension mismatch"
```
❌ Vector dimension (1536) doesn't match index (512)
```
**Fix**: Ensure you're using `text-embedding-3-small` with `dimensions: 512`

### "Rate limit exceeded"
```
❌ OpenAI rate limit error
```
**Fix**: Add delay between batches or reduce batch size

### "No content scraped"
```
❌ chunks.length === 0
```
**Fix**:
- Check URL is accessible
- Look at `dataProcessor.ts` - may need to adjust selectors
- Some sites block scraping

### "Metadata too large"
```
❌ Pinecone metadata size limit exceeded
```
**Fix**: Chunk text is too long. Reduce chunk size or trim metadata text field

---

## Understanding What You Built

Let's break down the flow:

**Request → Validation**
```typescript
uploadDocumentSchema.parse(body) // Zod validates structure
```
This ensures you only process valid URLs (proper format, array structure).

**Scraping → Chunking**
```typescript
processor.processUrls(urls) // Returns structured chunks
```
The processor fetches HTML, extracts text, and breaks it into manageable pieces with metadata.

**Text → Vectors**
```typescript
openaiClient.embeddings.create() // Converts meaning to numbers
```
OpenAI's model captures semantic meaning in a 512-dimensional space.

**Vectors → Database**
```typescript
index.upsert(vectors) // Stores in Pinecone
```
Your knowledge is now searchable by semantic similarity!

---

## What's Next?

Awesome! You now have a way to add knowledge to your RAG system. But RAG also needs a way to retrieve that knowledge intelligently.

That's where agents come in...

**Coming up:**
- Understanding agent architecture
- Building an agent routing system
- Creating specialized agents for different tasks

---

## Video Walkthrough

Watch me implement the upload pipeline step-by-step:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/upload-pipeline-implementation" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

---

## Challenge Solution

<details>
<summary>Click to reveal the complete implementation</summary>

```typescript
export async function POST(req: NextRequest) {
  try {
    // Step 1: Parse and validate
    const body = await req.json();
    const parsed = uploadDocumentSchema.parse(body);
    const { urls } = parsed;

    // Step 2: Scrape and chunk
    const processor = new DataProcessor();
    const chunks = await processor.processUrls(urls);

    // Step 3: Check if we got content
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No content found to process' },
        { status: 400 }
      );
    }

    // Step 4: Get Pinecone index
    const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

    // Step 5: Process in batches
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      // Step 6: Generate embeddings
      const embeddingResponse = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch.map((chunk) => chunk.content),
      });

      // Step 7: Prepare vectors
      const vectors = batch.map((chunk, idx) => ({
        id: `${chunk.metadata.url}-${chunk.metadata.chunkIndex}`,
        values: embeddingResponse.data[idx].embedding,
        metadata: {
          text: chunk.content,
          url: chunk.metadata.url || '',
          title: chunk.metadata.title || '',
          chunkIndex: chunk.metadata.chunkIndex || 0,
          totalChunks: chunk.metadata.totalChunks || 0,
        },
      }));

      // Step 8: Upload to Pinecone
      await index.upsert(vectors);
      successCount += batch.length;
    }

    // Step 9: Return success
    return NextResponse.json({
      success: true,
      chunksProcessed: chunks.length,
      vectorsUploaded: successCount,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    return NextResponse.json(
      { error: 'Failed to upload documents' },
      { status: 500 }
    );
  }
}
```

</details>
