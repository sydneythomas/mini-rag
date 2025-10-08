# Understanding Structured Outputs with Zod

One of the biggest challenges with LLMs is getting consistent, parseable JSON responses. OpenAI's structured output feature + Zod schemas solve this perfectly.

---

## What You'll Learn

- Why JSON parsing from LLMs is painful
- How structured outputs guarantee valid JSON
- Using Zod schemas for type-safe validation
- Real-world example with the selector agent
- When to use structured outputs vs regular completion

---

## The Problem: Unreliable JSON

### Traditional Approach (Fragile)

```typescript
// Ask LLM to return JSON
const response = await openai.chat.completions.create({
	model: 'gpt-4o-mini',
	messages: [
		{
			role: 'system',
			content: 'Return a JSON object with "agent" and "query" fields',
		},
		{ role: 'user', content: 'Write a LinkedIn post about AI' },
	],
});

// Try to parse the response
const text = response.choices[0].message.content;
const json = JSON.parse(text); // 💥 Might fail!
```

### What Can Go Wrong?

**1. Invalid JSON:**
```json
// LLM returns (missing comma):
{
  "agent": "linkedin"
  "query": "Write a LinkedIn post"
}
```

**2. Extra text around JSON:**
```
Here's the JSON you requested:
{"agent": "linkedin", "query": "Write a post"}
Hope that helps!
```

**3. Wrong field names:**
```json
{
  "selectedAgent": "linkedin",  // Expected "agent"
  "question": "Write a post"     // Expected "query"
}
```

**4. Wrong types:**
```json
{
  "agent": ["linkedin"],  // Should be string, not array
  "query": null           // Should be string, got null
}
```

### The Traditional Fix (Messy)

```typescript
try {
	// Try to extract JSON from response
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) throw new Error('No JSON found');

	const json = JSON.parse(match[0]);

	// Validate fields exist
	if (!json.agent || !json.query) {
		throw new Error('Missing required fields');
	}

	// Validate types
	if (typeof json.agent !== 'string') {
		throw new Error('Invalid agent type');
	}

	// Finally use it
	console.log(json.agent);
} catch (error) {
	// Handle all possible failures
	console.error('Failed to parse:', error);
}
```

**Problems:**
- Lots of validation code
- Easy to miss edge cases
- Not type-safe
- Manual error handling
- Unreliable in production

---

## The Solution: Structured Outputs + Zod

### What is Structured Output?

OpenAI's structured output feature **guarantees** that the LLM's response matches your schema. No more parsing errors!

**Key Benefits:**
- ✅ Valid JSON every time
- ✅ Correct field names
- ✅ Correct types
- ✅ Type-safe TypeScript
- ✅ No parsing errors

### What is Zod?

[Zod](https://zod.dev/) is a TypeScript-first schema validation library.

**You define schemas like:**
```typescript
const userSchema = z.object({
	name: z.string(),
	age: z.number(),
	email: z.string().email(),
});

// Type inference!
type User = z.infer<typeof userSchema>; // { name: string, age: number, email: string }
```

**Benefits:**
- Type-safe validation
- Runtime checking
- TypeScript type inference
- Composable schemas
- Clear error messages

---

## Real Example: Selector Agent

Let's examine how our selector agent uses structured outputs.

### Step 1: Define the Schema

Open `app/libs/openai/agents/types.ts`:

```typescript
import { z } from 'zod';

// Define valid agent types
export const agentSchema = z.enum(['linkedin', 'knowledgeBase']);

// Infer TypeScript type from schema
export type AgentType = z.infer<typeof agentSchema>;
// Result: 'linkedin' | 'knowledgeBase'
```

Now define the response schema in `selector-agent.ts`:

```typescript
// Zod schema for structured output validation
export const agentResponseSchema = z.object({
	selectedAgent: agentSchema,
	agentQuery: z.string().describe('The refined query for the selected agent'),
});

// TypeScript type inference
type AgentResponse = z.infer<typeof agentResponseSchema>;
// Result: { selectedAgent: 'linkedin' | 'knowledgeBase', agentQuery: string }
```

**What this means:**
- `selectedAgent` MUST be either "linkedin" or "knowledgeBase"
- `agentQuery` MUST be a string
- No other fields allowed
- OpenAI will enforce this schema

### Step 2: Use Structured Output

```typescript
const response = await openaiClient.responses.parse({
	text: {
		// Tell OpenAI to enforce our schema
		format: zodTextFormat(agentResponseSchema, 'agentResponse'),
	},
	model: 'gpt-4o-mini',
	input: [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'user', content: query },
	],
});

// This is GUARANTEED to match our schema!
const parsedResponse = response.output_parsed;
```

### Step 3: Type-Safe Usage

```typescript
// TypeScript knows the exact type!
const selectedAgent = parsedResponse.selectedAgent; // 'linkedin' | 'knowledgeBase'
const agentQuery = parsedResponse.agentQuery;       // string

// This would be a TypeScript error:
// const invalid = parsedResponse.invalidField; // ❌ Property doesn't exist
```

---

## How It Works Under the Hood

```
1. You define Zod schema
        ↓
2. zodTextFormat converts to OpenAI format
        ↓
3. OpenAI's model is constrained by schema
        ↓
4. Model can ONLY output valid JSON matching schema
        ↓
5. Response is automatically parsed and validated
        ↓
6. You get type-safe TypeScript object
```

**Magic:** OpenAI uses the schema to constrain the model's token generation. It literally cannot produce invalid JSON!

---

## Comparing Approaches

### Without Structured Output

```typescript
// ❌ Fragile, lots of validation code
const response = await openai.chat.completions.create({...});
const text = response.choices[0].message.content;

try {
	const json = JSON.parse(text);
	// Manual validation...
	if (!json.agent) throw new Error('Missing agent');
	// More validation...
} catch (error) {
	// Handle errors...
}
```

### With Structured Output

```typescript
// ✅ Clean, type-safe, guaranteed valid
const response = await openaiClient.responses.parse({
	text: {
		format: zodTextFormat(agentResponseSchema, 'agentResponse'),
	},
	// ...
});

const result = response.output_parsed; // Guaranteed valid!
```

---

## When to Use Structured Outputs

### ✅ Perfect For:

**1. Agent Routing**
```typescript
z.object({
	agent: z.enum(['sales', 'support', 'billing']),
	confidence: z.number().min(0).max(1),
})
```

**2. Data Extraction**
```typescript
z.object({
	name: z.string(),
	email: z.string().email(),
	phone: z.string().optional(),
})
```

**3. Classification**
```typescript
z.object({
	category: z.enum(['tech', 'business', 'science']),
	sentiment: z.enum(['positive', 'negative', 'neutral']),
})
```

**4. Multi-step Reasoning**
```typescript
z.object({
	reasoning: z.string(),
	answer: z.string(),
	confidence: z.number(),
})
```

### ❌ Not Needed For:

**1. Simple text generation**
- Chat responses
- Creative writing
- General Q&A

**2. Streaming responses**
- Real-time chat
- Progressive output

**3. When you want flexibility**
- Open-ended responses
- Conversational flows

---

## Advanced Zod Patterns

### Optional Fields

```typescript
z.object({
	agent: z.string(),
	query: z.string(),
	metadata: z.object({
		tags: z.array(z.string()).optional(),
		priority: z.number().optional(),
	}).optional(),
})
```

### Enums with Descriptions

```typescript
z.enum(['high', 'medium', 'low'])
	.describe('Priority level for the task')
```

### Nested Objects

```typescript
z.object({
	user: z.object({
		name: z.string(),
		age: z.number(),
	}),
	preferences: z.object({
		theme: z.enum(['light', 'dark']),
		notifications: z.boolean(),
	}),
})
```

### Arrays

```typescript
z.object({
	tags: z.array(z.string()),
	scores: z.array(z.number()).min(1).max(10),
})
```

### Unions

```typescript
z.object({
	result: z.union([
		z.object({ success: z.literal(true), data: z.string() }),
		z.object({ success: z.literal(false), error: z.string() }),
	]),
})
```

---

## Your Challenge: Explore the Selector Agent

Open `app/libs/openai/agents/selector-agent.ts` and study:

**1. Find the schema definition:**
```typescript
export const agentResponseSchema = z.object({...});
```
- What fields are required?
- What are their types?
- Why use `.describe()` on `agentQuery`?

**2. Find the API call:**
```typescript
const response = await openaiClient.responses.parse({...});
```
- How is the schema passed to OpenAI?
- What does `zodTextFormat` do?

**3. Find the result usage:**
```typescript
const parsedResponse = response.output_parsed;
```
- What's the type of `parsedResponse`?
- What fields can you access?
- Try adding a console.log to see the structure

**4. Run the selector agent tests:**
```bash
yarn test selector-agent
```
- See structured outputs in action
- Notice: no JSON parsing errors!

---

## Common Pitfalls

### ❌ Forgetting to handle null

```typescript
const parsedResponse = response.output_parsed;

if (!parsedResponse) {
	throw new Error('Failed to parse response');
}

// Now safe to use
const agent = parsedResponse.selectedAgent;
```

### ❌ Schema too complex

```typescript
// Too complex - model might struggle
z.object({
	step1: z.object({...}),
	step2: z.object({...}),
	step3: z.object({...}),
	// 20 more nested objects...
});
```

Keep schemas simple and focused!

### ❌ Not using descriptions

```typescript
// ❌ Vague
z.string()

// ✅ Clear
z.string().describe('The refined query optimized for the selected agent')
```

Descriptions help the model understand what to output!

---

## What's Next?

Now that you understand structured outputs, you're ready to learn about:

1. **System Prompts** - How to guide model behavior
2. **Few-Shot Prompting** - Teaching by example
3. **Temperature** - Controlling randomness

These concepts work together with structured outputs to create reliable AI agents!

---

## Quick Reference

**Install Zod:**
```bash
npm install zod
```

**Basic schema:**
```typescript
import { z } from 'zod';

const schema = z.object({
	name: z.string(),
	age: z.number(),
});

type Person = z.infer<typeof schema>;
```

**With OpenAI:**
```typescript
import { zodTextFormat } from 'openai/helpers/zod';

const response = await openaiClient.responses.parse({
	text: {
		format: zodTextFormat(schema, 'schemaName'),
	},
	// ...
});
```

**Useful Links:**
- [Zod Documentation](https://zod.dev/)
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Zod Cheat Sheet](https://zod.dev/?id=basic-usage)

---

## Video Walkthrough

Watch me explain structured outputs with the selector agent:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/structured-outputs" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
