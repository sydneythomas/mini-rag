# Implementing the Agent Selector

The selector is the brain of your agent system. Let's build it!

---

## Your Challenge

The selector route at `app/api/select-agent/route.ts` already has the structure. You just need to understand how it works.

### What It Does

**Input:** Array of messages (conversation history)

**Process:**
1. Takes last 5 messages for context
2. Builds prompt with agent descriptions
3. Asks GPT-4o-mini to decide which agent + refine query
4. Returns structured response

**Output:**
```json
{
  "agent": "rag",
  "query": "How do I use React hooks?"
}
```

---

## Understanding the Code

### Step 1: Validation

```typescript
const selectAgentSchema = z.object({
  messages: z.array(messageSchema).min(1),
});

const body = await req.json();
const parsed = selectAgentSchema.parse(body);
```

**What this does:**
- Ensures messages exist and is an array
- Validates each message has correct structure
- Throws error if validation fails (caught by try/catch)

### Step 2: Context Window

```typescript
const recentMessages = messages.slice(-5);
```

**The `.slice(-5)` trick:**
- Negative index starts from end
- Gets last 5 items
- If fewer than 5, gets all

```typescript
// Examples:
[1, 2, 3].slice(-5)           // [1, 2, 3] (all)
[1, 2, 3, 4, 5, 6].slice(-5)  // [2, 3, 4, 5, 6] (last 5)
```

### Step 3: Build Agent Descriptions

```typescript
const agentDescriptions = Object.entries(agentConfigs)
  .map(([key, config]) => `- "${key}": ${config.description}`)
  .join('\n');
```

**Breaking it down:**
```typescript
// agentConfigs = {
//   linkedin: { name: '...', description: 'For LinkedIn...' },
//   rag: { name: '...', description: 'For documentation...' }
// }

Object.entries(agentConfigs)
// → [['linkedin', {...}], ['rag', {...}]]

.map(([key, config]) => ...)
// → ['- "linkedin": For LinkedIn...', '- "rag": For documentation...']

.join('\n')
// → Joins with newlines for readable prompt
```

### Step 4: Call OpenAI with Structured Output

```typescript
const completion = await openaiClient.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  response_format: zodResponseFormat(
    agentSelectionSchema,
    'agentSelection'
  ),
});
```

**The magic: `zodResponseFormat`**

This tells OpenAI:
- Return JSON that matches this Zod schema
- No need for manual parsing
- Type-safe response

```typescript
const agentSelectionSchema = z.object({
  agent: agentTypeSchema,  // 'linkedin' | 'rag'
  query: z.string(),
});
```

### Step 5: Parse and Validate

```typescript
const content = completion.choices[0]?.message?.content;
const result = agentSelectionSchema.parse(JSON.parse(content));
```

**Two-step validation:**
1. OpenAI returns JSON string
2. Parse to JS object
3. Zod validates structure

**Why not trust OpenAI?**
- Always validate external input
- OpenAI might return malformed JSON (rare but possible)
- Zod provides type safety

---

## The Selector Prompt

```typescript
const systemPrompt = `You are an agent router.
Based on the conversation history, determine which agent should handle
the request and create a focused query.

Available agents:
${agentDescriptions}

The query should be a refined, clear version of what the user wants,
removing conversational fluff.`;
```

**Why this works:**

**1. Clear Role:**
"You are an agent router" - sets expectations

**2. Dynamic Agent List:**
Uses `agentConfigs` so adding agents auto-updates prompt

**3. Query Refinement:**
Explicitly asks for "refined, clear version"

**4. Context-Aware:**
"Based on conversation history" - uses recent messages

---

## Testing the Selector

### Using curl

```bash
curl -X POST http://localhost:3000/api/select-agent \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "How do I use useState in React?"
      }
    ]
  }'
```

**Expected response:**
```json
{
  "agent": "rag",
  "query": "How to use useState hook in React"
}
```

### Testing Context Understanding

```bash
curl -X POST http://localhost:3000/api/select-agent \
  -H "Content-Type": application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Tell me about React hooks"
      },
      {
        "role": "assistant",
        "content": "React hooks are functions that..."
      },
      {
        "role": "user",
        "content": "How about the state one?"
      }
    ]
  }'
```

**The selector should understand:**
- "state one" refers to "useState"
- Context from previous messages
- Should still route to RAG agent

---

## Common Edge Cases

### 1. Unclear Intent

```typescript
User: "hey"
```

**What happens:**
- Selector analyzes limited context
- Picks most general agent (usually RAG)
- Query refinement: "General greeting"

### 2. Multi-Topic Questions

```typescript
User: "Tell me about React hooks and how to improve my LinkedIn profile"
```

**What happens:**
- Selector picks ONE agent (can't route to both)
- Usually chooses based on primary intent
- Better UX: Tell user to ask one thing at a time

### 3. No Context

```typescript
User: "What about that thing?"
```

**Without conversation history:**
- Selector has no idea what "that thing" means
- Will pick general agent or ask for clarification

**With conversation history:**
- Can understand "that thing" from context
- Refines to specific query

---

## Why GPT-4o-mini for Selector?

**Why not GPT-4o?**
- Selector is simple classification task
- GPT-4o-mini is faster (lower latency)
- Cheaper (runs on every message)
- Good enough for routing decisions

**Cost comparison:**
- GPT-4o-mini: $0.00015 per 1K tokens
- GPT-4o: $0.0025 per 1K tokens

For a selector that runs on every message, savings add up!

---

## Improving the Selector

Want better routing? Try these:

### 1. Add Examples (Few-Shot Learning)

```typescript
const systemPrompt = `You are an agent router...

Examples:
User: "How do I network on LinkedIn?" → linkedin agent
User: "Explain React components" → rag agent
User: "Update my profile" → linkedin agent

Now route this request:`;
```

### 2. Add Confidence Score

```typescript
const agentSelectionSchema = z.object({
  agent: agentTypeSchema,
  query: z.string(),
  confidence: z.number().min(0).max(1), // 0-1 score
  reasoning: z.string(), // Why this agent?
});
```

### 3. Add Fallback Logic

```typescript
if (result.confidence < 0.7) {
  // Route to general agent or ask for clarification
}
```

---

## What You Learned

✅ How to use Zod for API validation
✅ How to structure LLM prompts for classification
✅ How to get structured output from OpenAI
✅ Why context windows matter
✅ How to build dynamic prompts from config

---

## What's Next?

Now that you can route requests, time to implement the actual agents!

**Coming up:**
- Building the LinkedIn agent with fine-tuned models
- Building the RAG agent with retrieval
- Connecting everything with streaming responses

---

## Video Walkthrough

Watch me implement and test the selector:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/selector-implementation" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
