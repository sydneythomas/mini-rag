# Implementing the Agent Selector

The selector is the brain of your agent system. It reads conversation history and decides which specialized agent should respond.

---

## Your Challenge: Text-Based Routing

The selector route at `app/api/select-agent/route.ts` has TODOs for you to implement. We'll start with a simple text-based approach, then upgrade to structured outputs.

### What It Does

**Input:** Array of messages (conversation history)

**Process:**

1. Takes last 5 messages for context
2. Builds prompt with agent descriptions
3. Asks GPT-4o-mini to decide which agent + refine query
4. Parses text response

**Output:**

```json
{
	"agent": "rag",
	"query": "How to use useState hook in React"
}
```

---

## Part 1: Text-Based Response (Start Here)

Let's implement agent selection using simple text parsing.

### Step 1: Understanding the Setup

The route already has some helpers:

```typescript
// Take last 5 messages for context
const recentMessages = messages.slice(-5);

// Build agent descriptions from config
const agentDescriptions = Object.entries(agentConfigs)
	.map(([key, config]) => `- "${key}": ${config.description}`)
	.join('\n');
```

**The `.slice(-5)` trick:**

-   Negative index starts from end
-   Gets last 5 items
-   If fewer than 5, gets all

```typescript
// Examples:
[1, 2, 3]
	.slice(-5) // [1, 2, 3] (all)
	[(1, 2, 3, 4, 5, 6)].slice(-5); // [2, 3, 4, 5, 6] (last 5)
```

### Step 2: Call OpenAI

Your first TODO: Call OpenAI with a prompt that asks for a specific text format.

**Response format we want:**

```
AGENT: rag
QUERY: How to use useState in React
```

**Implementation hints:**

```typescript
const completion = await openaiClient.chat.completions.create({
	model: 'gpt-4o-mini',
	messages: [
		{
			role: 'system',
			content: `You are an agent router. Based on the conversation history, determine which agent should handle the request.

Available agents:
${agentDescriptions}

Respond in this exact format:
AGENT: [agent_name]
QUERY: [refined query without conversational fluff]`,
		},
		...recentMessages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		})),
	],
});
```

### Step 3: Parse the Text Response

Now extract the agent and query from the text:

```typescript
const content = completion.choices[0]?.message?.content;
if (!content) {
	throw new Error('No response from OpenAI');
}

// Parse the text format
// Example content: "AGENT: rag\nQUERY: How to use useState"
const lines = content.split('\n');
const agentLine = lines.find((line) => line.startsWith('AGENT:'));
const queryLine = lines.find((line) => line.startsWith('QUERY:'));

const agent = agentLine?.split(':')[1]?.trim();
const query = queryLine?.split(':')[1]?.trim();
```

### Step 4: Validate and Return

```typescript
// Validate agent exists in config, fallback to 'rag'
const validAgent =
	agent && agentConfigs[agent as keyof typeof agentConfigs] ? agent : 'rag';

return NextResponse.json({
	agent: validAgent,
	query: query || messages[messages.length - 1]?.content || '',
});
```

---

## Testing Your Implementation

### Test 1: Simple Query

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

### Test 2: LinkedIn Query

```bash
curl -X POST http://localhost:3000/api/select-agent \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What should I put on my LinkedIn profile?"
      }
    ]
  }'
```

**Expected response:**

```json
{
	"agent": "linkedin",
	"query": "LinkedIn profile advice"
}
```

### Test 3: Context Understanding

```bash
curl -X POST http://localhost:3000/api/select-agent \
  -H "Content-Type: application/json" \
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

-   "state one" refers to "useState"
-   Context from previous messages
-   Should still route to RAG agent

---

## Why Start with Text Parsing?

**Pros:**

-   ✅ Simple to understand
-   ✅ Easy to debug (just read the response)
-   ✅ Works reliably with clear prompts
-   ✅ No extra dependencies

**Cons:**

-   ❌ Manual string parsing (brittle)
-   ❌ No type safety
-   ❌ LLM might not follow format exactly
-   ❌ Extra error handling needed

---

## Part 2: Upgrade to Structured Outputs (Challenge)

Now let's upgrade to use OpenAI's structured output feature with Zod schemas!

### What Are Structured Outputs?

Instead of parsing text, OpenAI can return JSON that matches a schema:

```typescript
// Define what we want back
const agentSelectionSchema = z.object({
	agent: agentTypeSchema, // 'linkedin' | 'rag'
	query: z.string(),
});

// OpenAI will return JSON matching this schema
```

### Step 1: Import the Helper

```typescript
import { zodTextFormat } from 'openai/helpers/zod';
```

### Step 2: Update the OpenAI Call

```typescript
const result = await openaiClient.responses.parse({
	model: 'gpt-4o-mini',
	input: [
		{
			role: 'system',
			content: `You are an agent router. Based on the conversation history, determine which agent should handle the request and create a focused query.

Available agents:
${agentDescriptions}

The query should be a refined, clear version of what the user wants, removing conversational fluff.`,
		},
		...recentMessages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		})),
	],
	text: {
		format: zodTextFormat(agentSelectionSchema, 'agent_selection'),
	},
});
```

### Step 3: Use the Parsed Result

```typescript
// Result is already parsed and validated
return NextResponse.json({
	agent: result.agent,
	query: result.query,
});
```

### Benefits of Structured Outputs

**Why upgrade?**

1. **Type Safety**: Zod validates the response
2. **Cleaner Code**: No manual string parsing
3. **Reliability**: OpenAI guarantees JSON format
4. **Better DX**: Auto-complete and type checking

**When to use text vs structured:**

-   Text: Quick prototypes, simple cases
-   Structured: Production code, complex schemas

---

## Understanding Zod Schemas

The schemas are defined in `app/agents/types.ts`:

```typescript
// Agent type is one of these strings
export const agentTypeSchema = z.enum(['linkedin', 'rag']);

// Each message has this shape
export const messageSchema = z.object({
	role: z.enum(['user', 'assistant', 'system']),
	content: z.string(),
});

// Selection response has this shape
const agentSelectionSchema = z.object({
	agent: agentTypeSchema,
	query: z.string(),
});
```

**What Zod does:**

-   Validates data matches expected structure
-   Throws error if validation fails (caught by try/catch)
-   Provides TypeScript types automatically

---

## Advanced: Improving the Selector

Want better routing? Try these enhancements:

### 1. Add Few-Shot Examples

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

## Why GPT-4o-mini for Selector?

**Why not GPT-4o?**

-   Selector is simple classification task
-   GPT-4o-mini is faster (lower latency)
-   Cheaper (runs on every message)
-   Good enough for routing decisions

**Cost comparison:**

-   GPT-4o-mini: $0.00015 per 1K tokens
-   GPT-4o: $0.0025 per 1K tokens

For a selector that runs on every message, savings add up!

---

## Common Issues and Solutions

### Issue: Wrong Agent Selected

**Cause:** Agent descriptions too vague

**Solution:** Make descriptions more specific:

```typescript
{
	description: 'For questions about React, TypeScript, and web development documentation';
}
// vs
{
	description: 'For technical questions'; // Too vague!
}
```

### Issue: Query Not Refined

**Cause:** Prompt doesn't emphasize refinement

**Solution:** Be explicit:

```typescript
content: `...
The query should be:
- Clear and specific
- Remove conversational words like "hey", "um", "please"
- Focus on the core question
- Use proper technical terms`;
```

### Issue: Parsing Errors (Text-Based)

**Cause:** LLM doesn't follow format exactly

**Solution:**

-   Add more explicit format instructions
-   Handle edge cases in parsing
-   Or upgrade to structured outputs!

---

## What You've Learned

✅ How to use Zod for API validation
✅ How to structure LLM prompts for classification
✅ Text parsing vs structured outputs
✅ Why context windows matter
✅ How to build dynamic prompts from config
✅ When to use GPT-4o-mini vs GPT-4o

---

## Complete Solutions

<details>
<summary>Solution 1: Text-Based Approach</summary>

```typescript
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const parsed = selectAgentSchema.parse(body);
		const { messages } = parsed;

		const recentMessages = messages.slice(-5);

		const agentDescriptions = Object.entries(agentConfigs)
			.map(([key, config]) => `- "${key}": ${config.description}`)
			.join('\n');

		const completion = await openaiClient.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `You are an agent router. Based on the conversation history, determine which agent should handle the request.

Available agents:
${agentDescriptions}

Respond in this exact format:
AGENT: [agent_name]
QUERY: [refined query]`,
				},
				...recentMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
			],
		});

		const content = completion.choices[0]?.message?.content;
		if (!content) {
			throw new Error('No response from OpenAI');
		}

		// Parse text response
		const lines = content.split('\n');
		const agentLine = lines.find((line) => line.startsWith('AGENT:'));
		const queryLine = lines.find((line) => line.startsWith('QUERY:'));

		const agent = agentLine?.split(':')[1]?.trim() || 'rag';
		const query =
			queryLine?.split(':')[1]?.trim() ||
			messages[messages.length - 1]?.content ||
			'';

		// Validate agent exists
		const validAgent = agentConfigs[agent as keyof typeof agentConfigs]
			? agent
			: 'rag';

		return NextResponse.json({
			agent: validAgent,
			query,
		});
	} catch (error) {
		console.error('Error selecting agent:', error);
		return NextResponse.json(
			{ error: 'Failed to select agent' },
			{ status: 500 }
		);
	}
}
```

</details>

<details>
<summary>Solution 2: Structured Outputs (Advanced)</summary>

```typescript
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const parsed = selectAgentSchema.parse(body);
		const { messages } = parsed;

		const recentMessages = messages.slice(-5);

		const agentDescriptions = Object.entries(agentConfigs)
			.map(([key, config]) => `- "${key}": ${config.description}`)
			.join('\n');

		const result = await openaiClient.responses.parse({
			model: 'gpt-4o-mini',
			input: [
				{
					role: 'system',
					content: `You are an agent router. Based on the conversation history, determine which agent should handle the request and create a focused query.

Available agents:
${agentDescriptions}

The query should be a refined, clear version of what the user wants, removing conversational fluff.`,
				},
				...recentMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
			],
			text: {
				format: zodTextFormat(agentSelectionSchema, 'agent_selection'),
			},
		});

		return NextResponse.json({
			agent: result.agent,
			query: result.query,
		});
	} catch (error) {
		console.error('Error selecting agent:', error);
		return NextResponse.json(
			{ error: 'Failed to select agent' },
			{ status: 500 }
		);
	}
}
```

</details>

---

## What's Next?

Now that you can route requests, time to implement the actual agents!

**Coming up:**

-   Module 8: Building the LinkedIn agent with your fine-tuned model
-   Module 9: Building the RAG agent with retrieval
-   Module 10: Connecting everything with streaming UI
