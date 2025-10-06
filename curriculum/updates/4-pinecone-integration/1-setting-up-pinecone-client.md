# Setting Up the Pinecone Client

Now that you understand what vector databases are and why we need them, let's integrate Pinecone into our application. This is where theory meets practice!

---

## What You'll Build

By the end of this module, you'll have:
- A configured Pinecone client that connects to your vector database
- Helper functions to search for similar documents
- Understanding of how embeddings flow from OpenAI to Pinecone

---

## The Big Picture: How It All Connects

Let's understand the complete flow before we write any code:

```
User Query
    ↓
1. Convert text to embedding (OpenAI)
    ↓
2. Search for similar embeddings (Pinecone)
    ↓
3. Retrieve matching documents
    ↓
4. Send to LLM with context
    ↓
Response to User
```

Today we're building step 2 - the Pinecone integration.

---

## Why a Client File?

You might wonder: "Why not just use Pinecone directly in our routes?"

**Good question!** Here's why we create a dedicated client file:

1. **Single Configuration Point**: API keys and setup in one place
2. **Reusability**: Use the same client across multiple routes
3. **Type Safety**: Define types once, use everywhere
4. **Easier Testing**: Mock one file instead of many imports
5. **Maintainability**: Change Pinecone config without touching business logic

---

## Understanding the File Structure

Our Pinecone integration lives at: `app/libs/pinecone.ts`

This file will:
- Initialize the Pinecone client with your API key
- Export a configured client for use throughout the app
- Provide helper functions for common operations (like searching)

---

## Environment Variables First

Before writing code, let's understand environment variables:

**What are they?**
- Secret configuration values (API keys, database URLs)
- Stored in `.env` or `.env.local` files
- Never committed to git (security!)

**Why use them?**
- Keep secrets out of code
- Different values for dev/staging/production
- Easy to change without code changes

### Your Environment Setup

1. Create a `.env.local` file in your project root (if you haven't already)
2. Add your Pinecone credentials:

```bash
PINECONE_API_KEY=your_api_key_here
PINECONE_INDEX=rag-tutorial
```

**Where to get these:**
- API Key: Pinecone console → API Keys
- Index Name: The name you created earlier

---

## The Pinecone Client: What You Need to Know

### Basic Initialization

The Pinecone SDK requires two things:
1. Your API key (for authentication)
2. An index name (which database to query)

```typescript
// Basic structure (you'll implement this!)
const client = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = client.Index('your-index-name');
```

### Key Concepts: Index vs. Client

- **Client**: The connection to Pinecone (authenticate once)
- **Index**: A specific vector database (query many times)

Think of it like:
- Client = Database connection
- Index = Specific table in that database

---

## Understanding Vector Queries

When you query Pinecone, you need:

1. **A vector** (the embedding to search with)
2. **topK** (how many results to return)
3. **includeMetadata** (whether to return the document text/metadata)

The response contains:
- Matching document IDs
- Similarity scores (0-1, higher = more similar)
- Metadata (the actual text content)

---

## Your Challenge

Now it's your turn! Open `app/libs/pinecone.ts` and you'll see:

```typescript
export const pineconeClient = // TODO: Initialize Pinecone client

export const searchDocuments = async (query: string, topK: number = 3) => {
  // TODO: Implement search functionality
  // Step 1: Get the index
  // Step 2: Convert query to embedding using OpenAI
  // Step 3: Query Pinecone with the embedding
  // Step 4: Return the matches
}
```

### Implementation Steps

**Step 1: Initialize the Client**
- Import the Pinecone SDK
- Create a new Pinecone instance with your API key
- Export it so other files can use it

**Step 2: Create the Search Function**
- Get your index from the client
- Generate an embedding for the search query (use OpenAI)
- Query Pinecone with that embedding
- Return the results

### Hints

**For the client:**
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

export const pineconeClient = new Pinecone({
  apiKey: // How do you access environment variables in Node.js?
});
```

**For searching:**
- You'll need the `openaiClient` from `app/libs/openai/openai.ts`
- Use `openaiClient.embeddings.create()` to get embeddings
- Use `index.query()` to search Pinecone
- The query returns a `matches` array

### What Good Looks Like

When done correctly:
- No TypeScript errors
- You can import `pineconeClient` in other files
- `searchDocuments()` accepts a string and returns matching documents

---

## Testing Your Implementation

Once you've implemented the functions, you can test them:

```typescript
// In a test file or route
import { searchDocuments } from '@/app/libs/pinecone';

const results = await searchDocuments('machine learning basics', 5);
console.log(results); // Should show matching documents!
```

---

## Common Issues & Solutions

### "Cannot read property 'PINECONE_API_KEY'"
- Check your `.env.local` file exists
- Restart your dev server after adding env variables
- Make sure you're using `process.env.PINECONE_API_KEY`

### "Index not found"
- Double-check your index name matches the console
- Index names are case-sensitive
- Make sure the index status is "Ready" in Pinecone console

### "Dimension mismatch"
- Your embeddings must match the index dimension (512)
- Check your OpenAI embedding model settings
- Verify in Pinecone console what dimension you created

---

## Understanding the Code You Just Wrote

Let's break down what each part does:

**The Client Export:**
```typescript
export const pineconeClient = new Pinecone({...})
```
This creates ONE connection that your entire app shares. It's more efficient than creating new connections each time.

**The Index Reference:**
```typescript
const index = pineconeClient.Index(process.env.PINECONE_INDEX!)
```
This points to your specific vector database. The `!` tells TypeScript "I know this exists".

**The Search Flow:**
```typescript
1. Get embedding from OpenAI
2. Pass embedding to Pinecone
3. Pinecone finds similar vectors
4. Returns documents with similarity scores
```

---

## What's Next?

Great job! You now have a working Pinecone integration. In the next module, we'll use this client to build the document upload route - where we actually add content to our vector database.

**Coming up:**
- Scraping web content
- Chunking text for optimal retrieval
- Generating embeddings at scale
- Uploading vectors to Pinecone

---

## Video Walkthrough

Watch me implement this step-by-step:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/pinecone-client-setup" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
