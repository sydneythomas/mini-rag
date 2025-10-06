# Implementing the LinkedIn Agent

Time to build your first agent! The LinkedIn agent uses a fine-tuned model to answer professional networking questions in your unique style.

---

## What You'll Build

By the end of this module, you'll have:
- A working LinkedIn agent
- Understanding of fine-tuned models vs. base models
- Knowledge of how to integrate fine-tuned models into your app

---

## What is Fine-Tuning?

**Base Models**: Trained on billions of web pages
- Know general knowledge
- Generic writing style
- Can't capture YOUR specific voice

**Fine-Tuned Models**: Your base model + your training data
- Learns YOUR patterns
- Mimics YOUR style
- Specialized for YOUR use case

### Real-World Analogy

**Base Model = Medical School Graduate**
- Knows general medicine
- Can treat common issues
- Generic bedside manner

**Fine-Tuned Model = Specialist Doctor**
- Still knows general medicine
- PLUS specialized knowledge
- PLUS experience with specific patient types

---

## When to Use Fine-Tuning

**✅ Good for:**
- Consistent style/tone (writing like you)
- Specific domain language (medical, legal, technical)
- Repeatable tasks (classification, formatting)
- When you have training data (100+ examples)

**❌ Not good for:**
- Latest information (model trained at point in time)
- Changing requirements (retraining is slow/costly)
- Small datasets (need meaningful examples)
- General knowledge (base models already excel)

**For this app:**
- LinkedIn agent: Fine-tuned (your professional voice)
- RAG agent: Base model + retrieval (up-to-date info)

---

## Understanding the LinkedIn Agent

Located at: `app/agents/linkedin.ts`

### What It Does

**Input:** User question about LinkedIn/careers
**Process:** Uses fine-tuned model to respond in your style
**Output:** Streamed response matching your professional voice

### The Structure

```typescript
export async function linkedInAgent(
  request: AgentRequest
): Promise<AgentResponse> {
  // Step 1: Get fine-tuned model ID
  // Step 2: Build system prompt
  // Step 3: Stream response
}
```

---

## Your Challenge

Open `app/agents/linkedin.ts` and implement the three TODO steps.

### Step 1: Get the Fine-Tuned Model

```typescript
// TODO: Step 1 - Get the fine-tuned model ID
// Access process.env.OPENAI_FINETUNED_MODEL
// If not configured, throw an error
```

**Why environment variable?**
- Model ID changes if you retrain
- Different models for dev/prod
- Keep config out of code

**Error handling:**
If the model isn't configured, the app shouldn't work. Fail fast!

### Step 2: Build the System Prompt

```typescript
// TODO: Step 2 - Build the system prompt
// Include instructions for the LinkedIn agent
// Add the original user request and refined query for context
// Tell the model to use the refined query to understand intent
```

**What makes a good system prompt?**

**1. Clear Role:**
"You are a professional assistant helping with LinkedIn and career-related questions."

**2. Context:**
Include both the original and refined queries so the model understands:
- What the user literally said
- What they actually mean

**3. Instructions:**
"Use the refined query to understand what the user is asking for, and provide a helpful response based on the conversation history."

### Step 3: Stream the Response

```typescript
// TODO: Step 3 - Stream the response
// Use streamText() from 'ai' package
// Pass the fine-tuned model using openai()
// Include the system prompt and conversation messages
// Return the stream
```

**Why `streamText`?**
- Returns chunks as they're generated
- Better UX (instant feedback)
- Standard pattern for chat apps

**The `openai()` helper:**
```typescript
import { openai } from '@ai-sdk/openai';

streamText({
  model: openai('your-model-id'),
  // ...
})
```

This helper wraps the OpenAI API in Vercel's AI SDK format.

---

## Getting a Fine-Tuned Model

**Don't have a fine-tuned model yet?** That's okay!

### Option 1: Use Base Model (for now)

```typescript
const fineTunedModel = process.env.OPENAI_FINETUNED_MODEL || 'gpt-4o-mini';
```

The agent will work with a base model, just won't have your style.

### Option 2: Fine-Tune Your Own

**Quick overview:**
1. Prepare training data (100+ examples)
2. Upload to OpenAI
3. Start fine-tuning job
4. Get model ID when complete
5. Add to `.env.local`

**Training data format:**
```jsonl
{"messages": [{"role": "system", "content": "You are..."}, {"role": "user", "content": "How do I network?"}, {"role": "assistant", "content": "Your response..."}]}
{"messages": [{"role": "system", "content": "You are..."}, {"role": "user", "content": "LinkedIn tips?"}, {"role": "assistant", "content": "Your response..."}]}
```

We won't cover fine-tuning in detail here (it's advanced!), but you can use the base model for now.

---

## Testing Your Agent

### 1. Through the API

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I improve my LinkedIn profile?"}
    ],
    "agent": "linkedin",
    "query": "LinkedIn profile improvement tips"
  }'
```

### 2. Through the Full Flow

1. Start your dev server: `yarn dev`
2. Use the chat UI (next module!)
3. Ask a LinkedIn question
4. Selector should route to LinkedIn agent
5. See the streamed response

---

## Common Issues

### "OPENAI_FINETUNED_MODEL not configured"

Add to your `.env.local`:
```bash
OPENAI_FINETUNED_MODEL=ft:gpt-4o-mini-2024-07-18:your-org:your-model:abc123
```

Or use fallback:
```typescript
const fineTunedModel = process.env.OPENAI_FINETUNED_MODEL || 'gpt-4o-mini';
```

### "Model not found"

- Check model ID is correct
- Ensure model training completed
- Verify API key has access to the model

### Response Doesn't Match Your Style

- Need more training data
- Training data quality issues
- May need more fine-tuning epochs

---

## Understanding What You Built

### The AgentRequest

```typescript
{
  type: 'linkedin',
  query: 'LinkedIn profile tips',           // Refined
  originalQuery: 'yo how do i make my profile better?',  // Original
  messages: [...conversation history]
}
```

The agent gets everything it needs to provide context-aware responses.

### The System Prompt

Including both queries gives the model:
- Intent (from refined query)
- Tone (from original query)
- Context (from messages)

### The Stream

```typescript
return streamText({
  model: openai(fineTunedModel),
  system: systemPrompt,
  messages: request.messages
});
```

Returns a `StreamTextResult` that the chat route can send to the client.

---

## What's Next?

Great! You've built the LinkedIn agent. Now let's build something more complex - the RAG agent that retrieves relevant context from your vector database.

**Coming up:**
- Implementing RAG retrieval
- Building context from search results
- Combining retrieval with generation

---

## Video Walkthrough

Watch me implement the LinkedIn agent:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/linkedin-agent-implementation" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

---

## Solution

<details>
<summary>Click to reveal the complete implementation</summary>

```typescript
import { AgentRequest, AgentResponse } from './types';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function linkedInAgent(
  request: AgentRequest
): Promise<AgentResponse> {
  // Step 1: Get the fine-tuned model ID
  const fineTunedModel = process.env.OPENAI_FINETUNED_MODEL;

  if (!fineTunedModel) {
    throw new Error('OPENAI_FINETUNED_MODEL not configured');
  }

  // Step 2: Build the system prompt
  const systemPrompt = `You are a professional assistant helping with LinkedIn and career-related questions.

Original User Request: "${request.originalQuery}"

Refined Query: "${request.query}"

Use the refined query to understand what the user is asking for, and provide a helpful response based on the conversation history.`;

  // Step 3: Stream the response
  return streamText({
    model: openai(fineTunedModel),
    system: systemPrompt,
    messages: request.messages,
  });
}
```

</details>
