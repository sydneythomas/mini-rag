# Building the Streaming Chat Interface

Time to build the chat UI that connects to your agent system with real-time streaming responses.

---

## What You'll Build

By the end of this section:
- Chat interface with message history
- Agent selection integration
- Streaming responses with useChat hook
- Complete end-to-end flow

---

## The useChat Hook

### What It Does

```typescript
import { useChat } from '@ai-sdk/react';

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
});
```

**Vercel's AI SDK provides everything:**

```
useChat Hook
    ↓
Manages:
- Message state (conversation history)
- Input state (current text)
- Loading state (waiting for AI)
- Streaming (real-time chunk updates)
- Error handling
```

**What you get:**

| Property | Type | Purpose |
|----------|------|---------|
| `messages` | `Message[]` | Full conversation history |
| `input` | `string` | Current text in input field |
| `handleInputChange` | `function` | Updates input on typing |
| `handleSubmit` | `function` | Sends message to API |
| `isLoading` | `boolean` | True while waiting for response |

---

## The Agent Selection Flow

This is where it gets interesting:

```typescript
const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  // Step 1: Build current conversation including new message
  const currentMessages = [
    ...messages,
    { role: 'user' as const, content: input },
  ];

  // Step 2: Select agent and refine query
  const agentResponse = await fetch('/api/select-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: currentMessages }),
  });

  const { agent, query } = await agentResponse.json();

  // Step 3: Submit to chat with agent info
  handleSubmit(e, {
    body: {
      agent,
      query,
    },
  });
};
```

**The Complete Flow:**

```
1. User types: "How do I use hooks?"
        ↓
2. handleChatSubmit intercepts
        ↓
3. Add user message to history
        ↓
4. Call /api/select-agent with full history
        ↓
5. Selector returns: { agent: 'rag', query: 'How to use React hooks' }
        ↓
6. handleSubmit sends to /api/chat with agent + query
        ↓
7. Chat route executes RAG agent
        ↓
8. Stream response chunks back
        ↓
9. useChat updates messages in real-time
        ↓
10. User sees response appear word-by-word
```

### Why Two API Calls?

**Call 1: `/api/select-agent`**
- Fast (GPT-4o-mini)
- Decides which agent
- Refines the query
- Returns JSON

**Call 2: `/api/chat`**
- Slower (full generation)
- Executes chosen agent
- Returns stream
- Updates UI in real-time

**Benefits:**
- Clear separation of concerns
- Can log selection separately
- Can show "Routing to RAG agent..." in UI
- Easier to debug

---

## Rendering Messages

### Understanding message.parts

Vercel AI SDK uses `parts` array:

```typescript
// User message
{
  id: '1',
  role: 'user',
  parts: ['How do I use hooks?']
}

// AI message (streaming)
{
  id: '2',
  role: 'assistant',
  parts: ['React hooks ', 'are functions ', 'that let you...']
}
```

**Why parts?**
- Supports streaming (chunks added as they arrive)
- Can contain mixed content (text + images)
- Each part can be string or object

### Displaying Messages

```typescript
{messages.map((message) => (
  <div key={message.id} className={...}>
    <p className='font-semibold'>
      {message.role === 'user' ? 'You' : 'AI'}
    </p>
    <div className='whitespace-pre-wrap'>
      {message.parts
        .map((part) =>
          typeof part === 'string'
            ? part
            : part.text || ''
        )
        .join('')}
    </div>
  </div>
))}
```

**The mapping logic:**
```typescript
message.parts.map(part =>
  typeof part === 'string' ? part : part.text || ''
)
```

- If part is string: use it
- If part is object: extract `.text` property
- Join all parts into single string

---

## Styling and UX

### Visual Differentiation

```typescript
className={`p-3 rounded ${
  message.role === 'user'
    ? 'bg-blue-100 ml-8'  // User: blue, left margin
    : 'bg-gray-100 mr-8'   // AI: gray, right margin
}`}
```

Creates the classic chat bubble effect.

### Loading State

```typescript
{isLoading && (
  <div className='p-3 rounded bg-gray-100 mr-8'>
    <p className='text-gray-500'>Thinking...</p>
  </div>
)}
```

Shows while:
1. Agent selection (~1 second)
2. Retrieval + generation (~2-5 seconds)

### Input Validation

```typescript
<button
  type='submit'
  disabled={isLoading || !input.trim()}
  className='px-6 py-2 bg-green-600 text-white rounded disabled:bg-gray-400'
>
  Send
</button>
```

**Disabled when:**
- `isLoading`: Already processing
- `!input.trim()`: Empty or whitespace-only

---

## How Streaming Works

### Behind the Scenes

```
Server (chat route):
  return streamText({...}).toTextStreamResponse()
        ↓
  Opens Server-Sent Events (SSE) connection
        ↓
  Sends chunks as they're generated
        ↓
Client (useChat):
  Receives each chunk
        ↓
  Appends to messages array
        ↓
  React re-renders
        ↓
User sees text appear in real-time
```

**No code required!** useChat handles everything:
- Opens connection
- Receives chunks
- Updates state
- Triggers re-renders

---

## Testing Your Chat

### Test 1: Basic Question

**Input:** "What are React hooks?"

**Expected:**
1. Message appears in chat
2. "Thinking..." indicator shows
3. Response streams in word-by-word
4. Both messages saved to history

### Test 2: Follow-Up Question

**Conversation:**
```
You: "Tell me about React hooks"
AI: [explains hooks]
You: "What about the state one?"
```

**Expected:**
- Selector understands "state one" = useState (from context)
- Routes to RAG agent
- Response references previous conversation

### Test 3: Different Agents

**Try:**
- "How do I improve my LinkedIn profile?" → LinkedIn agent
- "Explain React components" → RAG agent

**Check:** Different agents respond with different styles

### Test 4: Streaming

**Watch:**
- Response doesn't appear all at once
- Text streams in smoothly
- No flashing or jumping

---

## Common Issues

### "Messages not appearing"

**Debug:**
```typescript
console.log('Messages:', messages);
console.log('Is loading:', isLoading);
```

**Check:**
- Is `/api/chat` returning a stream?
- Is `handleSubmit` being called?
- Browser console errors?

### "Streaming doesn't work"

**Check agent returns stream:**
```typescript
// ✅ Correct
return streamText({...});

// ❌ Wrong
return await streamText({...});
```

**Check chat route:**
```typescript
// ✅ Correct
return result.toTextStreamResponse();

// ❌ Wrong
return result;
```

### "Agent selection fails"

**Debug:**
```typescript
const agentResponse = await fetch('/api/select-agent', {...});
console.log('Selected agent:', await agentResponse.json());
```

**Check:**
- Selector returns `{ agent, query }`
- Messages array includes current input
- No 500 errors

### "Message content is undefined"

**Issue:** Using `message.content` instead of `message.parts`

**Fix:**
```typescript
// ❌ Wrong
{message.content}

// ✅ Correct
{message.parts.map(...).join('')}
```

---

## What You Learned

✅ How to use Vercel's useChat hook
✅ How to integrate agent selection
✅ How streaming responses work
✅ How to render message parts correctly
✅ Loading states and UX best practices

---

## Congratulations!

You've built a complete RAG system:
- Document upload and vectorization ✅
- Agent architecture with routing ✅
- Fine-tuned LinkedIn agent ✅
- RAG agent with retrieval ✅
- Streaming chat interface ✅

**Optional enhancements:**
- Add authentication
- Add conversation persistence
- Add Helicone observability
- Deploy to production

---

## Video Walkthrough

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/streaming-chat" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
