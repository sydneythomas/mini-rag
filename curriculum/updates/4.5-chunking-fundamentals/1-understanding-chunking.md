# Understanding Text Chunking

Before you can vectorize documents, you need to break them into smaller pieces. This is called **chunking**, and it's critical to RAG system quality.

---

## What You'll Learn

- Why chunking is necessary for RAG
- Bad vs. good chunking strategies
- How overlap preserves context
- How to implement sentence-aware chunking

---

## Why Chunking Matters

### The Problem

**Documents are too long:**
- Embedding models have token limits (8,191 tokens)
- Entire document = diluted meaning ("average" of everything)
- User asks about hooks → retrieves entire 50,000-word doc
- Can't fit huge docs in LLM context window

### The Solution

```
50,000-word Document
        ↓
Break into 100 chunks of 500 chars each
        ↓
Each chunk = focused topic
        ↓
Retrieve only relevant chunks
```

**Benefits:**
- Focused, specific meaning per chunk
- Better embeddings (captures specific concepts)
- Precise retrieval (get exactly what you need)
- Fits in context windows

---

## Bad Chunking Examples

### ❌ Character Splitting

```typescript
function badCharacterChunking(text: string): string[] {
  return text.match(/.{1,500}/g) || [];
}

// Results in:
// "The company announced new feat"
// "ures including advanced AI c"
```

**Problem:** Breaks words mid-character!

### ❌ Word Splitting

```typescript
function badWordChunking(text: string): string[] {
  const words = text.split(' ');
  const chunks = [];
  for (let i = 0; i < words.length; i += 100) {
    chunks.push(words.slice(i, i + 100).join(' '));
  }
  return chunks;
}
```

**Problem:** Ignores sentence boundaries!

### Real Example

```typescript
// Original: "React Hooks were introduced in React 16.8. They allow you to use state..."

// ❌ Bad chunking produces:
[
  "React Hooks were introduced in React 16.8. They allow you to use state without wri",
  "ting a class component..."
]

// "wri" and "ting" are split - meaningless!
```

---

## Good Chunking: Sentence-Aware + Overlap

### The Strategy

```typescript
export type Chunk = {
  id: string;
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
  };
};
```

**Key principles:**
1. Split by sentences (`.`, `!`, `?`)
2. Combine sentences until size limit
3. Add overlap between chunks
4. Track metadata

---

## Why Overlap Matters

**Without Overlap:**
```
Chunk 1: "...useState is a hook."
Chunk 2: "It returns a pair of values..."
```

User: "what does useState return?"
- Chunk 1 has "useState" but not "return" ❌
- Chunk 2 has "return" but not "useState" ❌

**With Overlap (50 chars):**
```
Chunk 1: "...useState is a hook."
Chunk 2: "useState is a hook. It returns a pair of values..."
```

User: "what does useState return?"
- Chunk 2 has BOTH "useState" AND "return" ✅

### How Much Overlap?

- **Too little** (10 chars): Not enough context
- **Too much** (90%): Wasteful
- **Just right** (10-20% of chunk size): Perfect

For 500-char chunks → 50-100 char overlap

---

## Your Challenge: Implement Chunking

Create file: `app/libs/chunking.ts`

```typescript
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

export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
  source: string = 'unknown'
): Chunk[] {
  // TODO: Implement!
  return [];
}
```

### Implementation Steps

**1. Split into sentences**
```typescript
const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
```

**2. Build chunks**
```typescript
const chunks: Chunk[] = [];
let currentChunk = '';
let chunkIndex = 0;

for (const sentence of sentences) {
  const sent = sentence.trim() + '.';

  if (currentChunk.length + sent.length > chunkSize && currentChunk.length > 0) {
    // Save current chunk
    chunks.push({
      id: `${source}-chunk-${chunkIndex}`,
      content: currentChunk.trim(),
      metadata: { source, chunkIndex, totalChunks: 0, startChar: 0, endChar: currentChunk.length }
    });

    // Start new chunk with overlap
    const overlapText = getLastWords(currentChunk, overlap);
    currentChunk = overlapText + ' ' + sent;
    chunkIndex++;
  } else {
    currentChunk += (currentChunk ? ' ' : '') + sent;
  }
}
```

**3. Helper for overlap**
```typescript
function getLastWords(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const words = text.split(' ');
  let result = '';

  // Build backwards to get LAST words
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (result.length + word.length + 1 > maxLength) break;
    result = word + (result ? ' ' + result : '');
  }

  return result;
}
```

**4. Update totalChunks**
```typescript
chunks.forEach(chunk => {
  chunk.metadata.totalChunks = chunks.length;
});
```

---

## Testing

```typescript
const text = "React Hooks were introduced in React 16.8. They allow you to use state and other React features without writing a class component. The most commonly used hooks are useState and useEffect.";

const chunks = chunkText(text, 100, 20, 'test');

console.log(`Created ${chunks.length} chunks`);
chunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i}:`, chunk.content);
});
```

**Verify:**
- ✅ No broken words
- ✅ Complete sentences
- ✅ Overlap between chunks
- ✅ Readable chunks

---

## What You Learned

✅ Why chunking is critical (retrieval precision)
✅ Bad strategies break meaning
✅ Sentence-based + overlap = best
✅ 10-20% overlap maintains context

---

## What's Next

Module 5 uses your chunking implementation in the document upload pipeline!

---

## Video Walkthrough

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/chunking-fundamentals" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

---

## Solution

<details>
<summary>Click to reveal implementation</summary>

```typescript
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

    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      const chunk: Chunk = {
        id: `${source}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex,
          totalChunks: 0,
          startChar: chunkStart,
          endChar: chunkStart + currentChunk.length,
        },
      };

      chunks.push(chunk);

      const overlapText = getLastWords(currentChunk, overlap);
      currentChunk = overlapText + ' ' + sentence;
      chunkStart = chunk.metadata.endChar - overlapText.length;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

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

  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = chunks.length;
  });

  return chunks;
}

function getLastWords(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const words = text.split(' ');
  let result = '';

  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (result.length + word.length + 1 > maxLength) break;
    result = word + (result ? ' ' + result : '');
  }

  return result;
}
```

</details>
