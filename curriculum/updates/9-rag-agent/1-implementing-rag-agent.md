# Implementing the RAG Agent

Time to build the most complex agent - the RAG agent combines retrieval with generation for accurate, sourced answers.

---

## What You'll Build

By the end of this module, you'll have:
- A working RAG agent that retrieves context from Pinecone
- Understanding of semantic search
- Knowledge of context-building for LLMs
- Complete retrieval-augmented generation pipeline

---

## What is RAG?

**RAG = Retrieval-Augmented Generation**

### The Problem RAG Solves

**Base Models:**
- Trained at a point in time (knowledge cutoff)
- Can't know YOUR specific documents
- Sometimes hallucinate facts
- No way to verify sources

**RAG Solution:**
```
User Question
    ↓
1. Search your documents (retrieval)
    ↓
2. Find relevant context
    ↓
3. Feed context to model (augmentation)
    ↓
4. Generate answer based on YOUR data (generation)
```

### Real-World Analogy

**Without RAG = Closed Book Exam**
- Student relies only on memory
- Might forget details
- Can't verify answers
- Might guess wrong

**With RAG = Open Book Exam**
- Student can look up information
- Accurate, sourced answers
- Can cite specific pages
- Higher quality responses

---

## The RAG Pipeline

Located at: `app/agents/rag.ts`

### Overview

```typescript
export async function ragAgent(request: AgentRequest): Promise<AgentResponse> {
  // Step 1: Turn question into embedding
  // Step 2: Search Pinecone for similar content
  // Step 3: Extract text from results
  // Step 4: Build prompt with context
  // Step 5: Stream LLM response
}
```

**Why this order?**
1. Embeddings enable semantic search
2. Vector search finds relevant docs
3. Text extraction prepares context
4. Prompt engineering connects everything
5. Streaming provides great UX

---

## Your Challenge

Open `app/agents/rag.ts` and implement the five TODO steps.

### Step 1: Generate Embedding for the Query

```typescript
// TODO: Step 1 - Generate embedding for the refined query
// Use openaiClient.embeddings.create() with model 'text-embedding-3-small'
// Input should be request.query
```

**What's happening:**

```
"How do I use React hooks?"
          ↓
  embedding model
          ↓
[0.023, -0.891, 0.445, ...] (512 numbers)
```

The query becomes a vector in the same space as your documents.

**Why the refined query?**
- Selector already cleaned it up
- Better matches for semantic search
- No conversational fluff

**The Code Pattern:**

```typescript
const embeddingResponse = await openaiClient.embeddings.create({
  model: 'text-embedding-3-small',
  input: request.query,
});

const embedding = embeddingResponse.data[0].embedding;
```

**Key points:**
- Use `text-embedding-3-small` (same as document embeddings)
- Response is an array, get first item: `.data[0]`
- Embedding is the `.embedding` property

---

### Step 2: Query Pinecone for Similar Documents

```typescript
// TODO: Step 2 - Query Pinecone for similar documents
// Get the index using pineconeClient.Index()
// Query with the embedding vector
// Set topK to 5 to get top 5 results
// Include metadata but not values
```

**What's happening:**

```
Your Query Embedding
        ↓
  Pinecone Search
        ↓
Finds 5 most similar document chunks
        ↓
Returns: text, url, title, score
```

**The Code Pattern:**

```typescript
const index = pineconeClient.Index(process.env.PINECONE_INDEX as string);

const queryResponse = await index.query({
  vector: embedding,
  topK: 5,
  includeMetadata: true,
});
```

**Understanding the parameters:**

**`vector`**: Your query embedding (512 numbers)
- Pinecone compares this to all document embeddings
- Uses cosine similarity to find closest matches

**`topK: 5`**: Return top 5 results
- More results = more context but also more noise
- 5 is a good balance for most queries
- Can adjust based on your use case

**`includeMetadata: true`**: Get the stored text
- Remember: vectors are stored with metadata
- Metadata contains the actual text content
- Without this, you just get IDs and scores

**What you get back:**

```typescript
{
  matches: [
    {
      id: 'doc-1-chunk-0',
      score: 0.92,  // Similarity score (0-1)
      metadata: {
        text: 'React hooks are functions...',
        url: 'https://...',
        title: 'React Documentation',
        chunkIndex: 0,
        totalChunks: 5
      }
    },
    // ... 4 more matches
  ]
}
```

---

### Step 3: Extract Text Content from Results

```typescript
// TODO: Step 3 - Extract the text content from results
// Map over queryResponse.matches
// Get the 'text' field from each match's metadata
// Join all text chunks with double newlines
```

**What's happening:**

```
Pinecone Results (objects)
        ↓
  Extract text field
        ↓
Join with newlines
        ↓
Single context string
```

**The Code Pattern:**

```typescript
const retrievedContext = queryResponse.matches
  .map((match) => match.metadata?.text)
  .filter(Boolean)  // Remove any undefined values
  .join('\n\n');
```

**Why filter(Boolean)?**
- TypeScript doesn't guarantee metadata exists
- Some matches might not have text
- `filter(Boolean)` removes falsy values

**Why join with `\n\n`?**
- Double newline = paragraph break
- Helps LLM understand separate chunks
- More readable in prompts

**Result:**

```
"React hooks are functions that let you use state...

The useState hook returns a pair: the current state value...

You can use multiple hooks in a single component..."
```

---

### Step 4: Build the System Prompt with Context

```typescript
// TODO: Step 4 - Build the system prompt with context
// Include both the original and refined queries
// Add the retrieved context
// Instruct the model to use the context to answer
```

**What's happening:**

```
Retrieved Context + User Query + Instructions
              ↓
      System Prompt
              ↓
    Guides LLM response
```

**The Code Pattern:**

```typescript
const systemPrompt = `You are a helpful assistant that answers questions based on the provided context.

Original User Request: "${request.originalQuery}"

Refined Query: "${request.query}"

Context from documentation:
${retrievedContext}

Use the context above to answer the user's question. If the context doesn't contain enough information, say so clearly.`;
```

**Why include both queries?**

**Original Query:**
- "yo what's that hook thingy for state?"
- Shows user's tone and exact words
- Helps maintain conversational style

**Refined Query:**
- "What is the React useState hook?"
- Shows clear intent
- Helps model understand what to focus on

**Why explicit instructions?**
- "Use the context above" - grounds the model
- "If context doesn't contain..." - reduces hallucination
- Clear boundaries = better responses

---

### Step 5: Stream the Response

```typescript
// TODO: Step 5 - Stream the response
// Use streamText() with model 'gpt-4o'
// Pass the system prompt and conversation messages
// Return the stream
```

**What's happening:**

```
System Prompt + Conversation History
              ↓
          GPT-4o
              ↓
      Streamed Response
              ↓
    Real-time UI update
```

**The Code Pattern:**

```typescript
return streamText({
  model: openai('gpt-4o'),
  system: systemPrompt,
  messages: request.messages,
});
```

**Why GPT-4o (not mini)?**
- RAG requires understanding complex context
- GPT-4o better at synthesis
- Higher quality answers from retrieved docs
- Worth the extra cost for accuracy

**Why stream?**
- User sees response immediately
- Better perceived performance
- Can stop generation if wrong direction
- Standard pattern for chat apps

**Return type:**
- `streamText()` returns `StreamTextResult`
- Matches the `AgentResponse` type
- Chat route calls `.toTextStreamResponse()`

---

## Understanding What You Built

### The Complete Flow

```
1. User: "How do I use React hooks?"
        ↓
2. Selector: agent='rag', query='How to use React hooks'
        ↓
3. RAG Agent:
   a. Query → Embedding [0.23, -0.89, ...]
   b. Pinecone Search → 5 relevant chunks
   c. Extract text → "React hooks are..."
   d. Build prompt → System + Context + Messages
   e. Stream response → GPT-4o generates answer
        ↓
4. User sees: "Based on the documentation, React hooks..."
```

### Why RAG Works Better Than Fine-Tuning Here

**Fine-Tuning (LinkedIn Agent):**
✅ Learns your writing style
✅ Consistent tone
❌ Static knowledge (trained once)
❌ Can't update without retraining
❌ No source attribution

**RAG (Documentation Agent):**
✅ Always uses latest docs
✅ Can cite sources
✅ Easy to update (just add docs)
✅ Grounded in your data
❌ More complex pipeline
❌ Requires vector database

---

## Testing Your RAG Agent

### 1. Through the API

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I use useState?"}
    ],
    "agent": "rag",
    "query": "How to use useState hook in React"
  }'
```

### 2. Check Retrieved Context

Add a console.log to see what was retrieved:

```typescript
console.log('Retrieved context:', retrievedContext);
```

**Good retrieval:**
- Text is relevant to the query
- Contains useful information
- Makes sense together

**Bad retrieval:**
- Unrelated topics
- Too generic
- Missing key information

### 3. Through the Full Flow

1. Upload documents (Module 5)
2. Start dev server: `yarn dev`
3. Ask a question in chat UI
4. Selector routes to RAG agent
5. See streamed, context-aware response

---

## Common Issues

### "No results from Pinecone"

**Possible causes:**
- Index is empty (did you upload documents?)
- Query embedding failed
- Index name wrong

**Debug:**
```typescript
console.log('Query response:', queryResponse);
console.log('Number of matches:', queryResponse.matches.length);
```

### "Context doesn't match question"

**Possible causes:**
- Documents don't contain relevant info
- Embeddings are poor quality
- TopK too low (try 10 instead of 5)

**Fix:**
- Upload more relevant documents
- Improve chunking strategy
- Adjust topK parameter

### "Model ignores context"

**Possible causes:**
- System prompt not clear enough
- Context too long (truncated)
- Context contradicts model's training

**Fix:**
- Strengthen prompt: "ONLY use the context"
- Reduce topK or chunk size
- Add examples in prompt

### "Streaming doesn't work"

**Check:**
- Return statement returns the stream directly
- No `await` on streamText()
- Chat route calls `.toTextStreamResponse()`

---

## Advanced: Understanding Semantic Search

### How Embeddings Enable Semantic Search

**Traditional Keyword Search:**
```
Query: "react state management"
Finds: Documents with exact words "react", "state", "management"
Misses: Documents about "useState", "component state", "hooks"
```

**Semantic Search (Embeddings):**
```
Query: "react state management"
Embedding: [0.23, -0.89, 0.45, ...]

Finds documents with embeddings near this vector:
- "useState hook tutorial" [0.21, -0.87, 0.48, ...]  ✅ Close
- "managing component state" [0.25, -0.88, 0.43, ...] ✅ Close
- "Python variables" [0.89, 0.34, -0.67, ...] ❌ Far
```

Embeddings capture meaning, not just words!

### Cosine Similarity Visualization

```
      Your Query
         /|\
        / | \
       /  |  \
      /   |   \
Similar  Somewhat  Unrelated
 Docs     Similar    Docs
(0.9)     (0.6)     (0.2)
```

Higher score = more similar in meaning.

---

## Improving Your RAG System

### 1. Add Re-ranking (Advanced)

```typescript
// After Pinecone query, re-rank with Cohere
const rerankedResults = await pineconeClient.inference.rerank({
  model: 'rerank-english-v3.0',
  query: request.query,
  documents: queryResponse.matches.map(m => ({ text: m.metadata.text })),
  topN: 3,  // Get top 3 from 5 results
  returnDocuments: true,
});
```

**Why re-rank?**
- Pinecone uses vector similarity
- Re-ranker uses cross-attention (more accurate)
- Improves relevance of top results

### 2. Add Source Attribution

```typescript
const sourcesUsed = queryResponse.matches
  .map((match) => ({
    url: match.metadata?.url,
    title: match.metadata?.title,
    score: match.score,
  }));

// Include in system prompt or return metadata
```

### 3. Hybrid Search (Vector + Keyword)

Pinecone supports combining vector and keyword search for best of both worlds.

---

## What You Learned

✅ How RAG combines retrieval with generation
✅ How to generate embeddings for queries
✅ How to perform semantic search with Pinecone
✅ How to build context-aware prompts
✅ Why RAG is better than fine-tuning for documentation
✅ How to debug retrieval quality

---

## What's Next?

Great! You've built both agents (LinkedIn + RAG). Now let's connect everything with a streaming chat UI so users can actually interact with your system.

**Coming up:**
- Building the chat interface with Vercel AI SDK
- Implementing message selection and routing
- Creating a complete user experience

---

## Video Walkthrough

Watch me implement the RAG agent:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/rag-agent-implementation" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

---

## Solution

<details>
<summary>Click to reveal the complete implementation</summary>

```typescript
import { AgentRequest, AgentResponse } from './types';
import { pineconeClient } from '@/app/libs/pinecone';
import { openaiClient } from '@/app/libs/openai/openai';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function ragAgent(request: AgentRequest): Promise<AgentResponse> {
  // Step 1: Generate embedding for the refined query
  const embeddingResponse = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: request.query,
  });

  const embedding = embeddingResponse.data[0].embedding;

  // Step 2: Query Pinecone for similar documents
  const index = pineconeClient.Index(process.env.PINECONE_INDEX as string);

  const queryResponse = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });

  // Step 3: Extract the text content from results
  const retrievedContext = queryResponse.matches
    .map((match) => match.metadata?.text)
    .filter(Boolean)
    .join('\n\n');

  // Step 4: Build the system prompt with context
  const systemPrompt = `You are a helpful assistant that answers questions based on the provided context.

Original User Request: "${request.originalQuery}"

Refined Query: "${request.query}"

Context from documentation:
${retrievedContext}

Use the context above to answer the user's question. If the context doesn't contain enough information, say so clearly.`;

  // Step 5: Stream the response
  return streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: request.messages,
  });
}
```

</details>
