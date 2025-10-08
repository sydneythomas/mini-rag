# System Prompts and Temperature Control

System prompts and temperature are two critical parameters for controlling AI behavior. Let's learn how to use them effectively through the selector agent example.

---

## What You'll Learn

- What system prompts are and why they matter
- How to write effective system prompts
- What temperature controls
- When to use high vs low temperature
- Real examples from the selector agent

---

## Part 1: System Prompts

### What is a System Prompt?

A **system prompt** sets the AI's role, behavior, and constraints. It's like giving the AI instructions before the conversation starts.

**Analogy:** Hiring an employee
- System prompt = Job description + Training manual
- User message = Specific task to do

### Message Roles

OpenAI models understand three message roles:

```typescript
{
	role: 'system',  // Instructions for the AI
	content: 'You are a helpful assistant...'
},
{
	role: 'user',    // User's input
	content: 'Help me with this task...'
},
{
	role: 'assistant', // AI's previous responses
	content: 'Sure, I can help...'
}
```

**Order matters:**
1. **System** - Sets context (optional but recommended)
2. **User/Assistant** - Conversation history
3. **User** - Latest message to respond to

---

## Selector Agent System Prompt

Let's examine the selector agent's system prompt:

```typescript
const SYSTEM_PROMPT = `You are a helpful assistant that selects the best agent to answer the user query. You should select the agent that is most likely to answer the user query correctly.

Agents:

${Object.values(AGENT_CONFIG)
	.map((agent) => `- ${agent.name}: ${agent.description}`)
	.join('\n')}

Your task is to:
1. Analyze the user's query
2. Select the most appropriate agent
3. Refine the query if needed to better suit the selected agent
4. Return both the selected agent and the refined query
`;
```

### Breaking Down This Prompt

**1. Define the role:**
```
"You are a helpful assistant that selects the best agent..."
```
- Clear identity
- Specific task
- Helpful tone

**2. Provide context (agent list):**
```
Agents:
- LinkedIn Agent: Creates professional LinkedIn content
- Knowledge Base Agent: Answers questions about tech docs
```
- Shows available options
- Describes each agent's purpose
- Dynamic (generated from config)

**3. Give explicit instructions:**
```
Your task is to:
1. Analyze the user's query
2. Select the most appropriate agent
3. Refine the query if needed
4. Return both the selected agent and the refined query
```
- Step-by-step process
- Clear expectations
- Numbered for clarity

---

## Why This Prompt Works

### ✅ Good Practices Demonstrated

**1. Clear Role Definition**
```
"You are a helpful assistant that selects..."
```
Not: "You should probably try to maybe pick an agent"

**2. Concrete Examples**
```
- LinkedIn Agent: Creates professional LinkedIn content
```
Shows what each agent does

**3. Explicit Task Breakdown**
```
1. Analyze
2. Select
3. Refine
4. Return
```
No ambiguity about what to do

**4. Dynamic Content**
```typescript
${Object.values(AGENT_CONFIG).map(...).join('\n')}
```
Automatically updates when agents change

---

## System Prompt Best Practices

### ✅ DO:

**Be Specific**
```typescript
// ❌ Vague
"You help users"

// ✅ Specific
"You are an expert at routing customer queries to the right support agent"
```

**Use Examples**
```typescript
"Select the best agent for the query.

Examples:
- 'Write a LinkedIn post' → LinkedIn Agent
- 'How do React hooks work?' → Knowledge Base Agent"
```

**Set Constraints**
```typescript
"You must select exactly one agent.
You cannot create new agents.
If unsure, default to Knowledge Base Agent."
```

**Define Output Format**
```typescript
"Return your response as JSON with these fields:
- selectedAgent: string
- agentQuery: string"
```

### ❌ DON'T:

**Be Too Long**
```typescript
// ❌ Too much (500+ words)
"You are an incredibly sophisticated AI system with vast knowledge... [continues for 10 paragraphs]"

// ✅ Concise
"You select the best agent for user queries."
```

**Be Ambiguous**
```typescript
// ❌ Unclear
"Try to pick a good agent maybe"

// ✅ Clear
"Select the most appropriate agent"
```

**Contradict Yourself**
```typescript
// ❌ Contradictory
"Always select LinkedIn Agent. Pick the best agent for the task."

// ✅ Consistent
"Select LinkedIn Agent only for professional content creation."
```

---

## Part 2: Temperature

### What is Temperature?

**Temperature** controls randomness in the model's responses.

**Range:** 0.0 to 2.0
- **0.0** = Deterministic (same input → same output)
- **1.0** = Balanced (default)
- **2.0** = Very creative/random

### How It Works

The model generates tokens based on probability:

```
Input: "The capital of France is"

Temperature 0.0:
- Paris (99.9%) ← Always picks highest probability
- London (0.05%)
- Rome (0.03%)
→ Output: "Paris" (every time)

Temperature 1.0:
- Paris (99.9%) ← Usually picks, but not always
- London (0.05%) ← Might pick occasionally
- Rome (0.03%)
→ Output: "Paris" (most times), occasionally others

Temperature 2.0:
- Paris (60%) ← Lower confidence
- London (20%) ← More likely now
- Rome (15%)
- Madrid (5%) ← Even unlikely options appear
→ Output: Unpredictable!
```

---

## When to Use Each Temperature

### Temperature 0.0 - 0.3 (Deterministic)

**Use for:**
- ✅ Classification tasks
- ✅ Agent routing
- ✅ Data extraction
- ✅ Factual answers
- ✅ When consistency matters

**Example: Selector Agent**
```typescript
const response = await openaiClient.responses.parse({
	model: 'gpt-4o-mini',
	// TRY ADDING: temperature: 0.1, // Low temperature for consistent routing
	input: [...],
});
```

**Why low temperature?**
- "Write a LinkedIn post" should ALWAYS → LinkedIn Agent
- Don't want randomness in routing logic
- Need predictable behavior

### Temperature 0.7 - 1.0 (Balanced)

**Use for:**
- ✅ General chat
- ✅ Q&A systems
- ✅ Summarization
- ✅ Translation

**Example:**
```typescript
// General purpose assistant
const response = await openai.chat.completions.create({
	model: 'gpt-4o-mini',
	temperature: 0.8, // Balanced
	messages: [...],
});
```

### Temperature 1.5 - 2.0 (Creative)

**Use for:**
- ✅ Creative writing
- ✅ Brainstorming
- ✅ Poetry/lyrics
- ✅ Humor

**Example:**
```typescript
// Creative content generation
const response = await openai.chat.completions.create({
	model: 'gpt-4o-mini',
	temperature: 1.8, // Very creative
	messages: [
		{ role: 'user', content: 'Write a funny poem about programming' }
	],
});
```

---

## Selector Agent: Temperature Experiment

The selector agent has a commented suggestion:

```typescript
const response = await openaiClient.responses.parse({
	model: 'gpt-4o-mini',
	// TRY ADDING: temperature: 0.1, // Low temperature for consistent routing
	input: [...],
});
```

### Why Temperature 0.1?

**Problem without it:**
```typescript
// Temperature 1.0 (default)
Query: "Tell me about React hooks"

Run 1: → Knowledge Base Agent ✅
Run 2: → LinkedIn Agent ❌ (might think you want to post about it)
Run 3: → Knowledge Base Agent ✅
Run 4: → LinkedIn Agent ❌
```

**Solution with temperature 0.1:**
```typescript
// Temperature 0.1
Query: "Tell me about React hooks"

Run 1: → Knowledge Base Agent ✅
Run 2: → Knowledge Base Agent ✅
Run 3: → Knowledge Base Agent ✅
Run 4: → Knowledge Base Agent ✅
```

**Result:** Consistent, predictable routing!

---

## Your Challenge: Experiment with Temperature

### Task 1: Add Temperature to Selector

1. Open `app/libs/openai/agents/selector-agent.ts`
2. Find the `openaiClient.responses.parse()` call
3. Add `temperature: 0.1` as a parameter
4. Run the tests multiple times:
   ```bash
   for i in {1..5}; do yarn test selector-agent; done
   ```
5. Observe: Same input → Same output every time!

### Task 2: Try High Temperature

1. Change to `temperature: 1.5`
2. Run tests multiple times
3. Observe: Same input → Different results!
4. Which is better for routing? (Hint: Low temperature)

### Task 3: Test Different Queries

Create a test script:

```typescript
// test-temperature.ts
const queries = [
	'Write a LinkedIn post about TypeScript',
	'Explain React hooks',
	'How do I use useState?',
];

for (const query of queries) {
	console.log(`Query: ${query}`);

	// Run 5 times to see consistency
	for (let i = 0; i < 5; i++) {
		const result = await selectAgent(query);
		console.log(`  Run ${i + 1}: ${result.selectedAgent}`);
	}
}
```

Compare temperature 0.1 vs 1.0 vs 1.8!

---

## Combining System Prompts and Temperature

These work together for optimal results:

```typescript
const response = await openaiClient.responses.parse({
	text: {
		format: zodTextFormat(schema, 'name'),
	},
	model: 'gpt-4o-mini',
	temperature: 0.1,  // ← Consistent routing
	input: [
		{
			role: 'system',
			content: SYSTEM_PROMPT, // ← Clear instructions
		},
		{
			role: 'user',
			content: query,
		},
	],
});
```

**Result:**
- System prompt guides WHAT to do
- Low temperature ensures CONSISTENCY
- Structured output guarantees VALID response
- Perfect for production!

---

## Advanced: Top P (Alternative to Temperature)

**Top P** (nucleus sampling) is an alternative to temperature:

```typescript
{
	temperature: 1.0,
	top_p: 0.9, // Consider top 90% of probability mass
}
```

**How it works:**
- Instead of considering all tokens
- Only consider top X% by cumulative probability
- More focused than temperature

**Rule of thumb:**
- Use EITHER temperature OR top_p
- Don't use both
- Temperature is simpler to understand

---

## Common Patterns

### Pattern 1: Strict Classification

```typescript
{
	temperature: 0.0,  // Deterministic
	// System prompt with clear categories
}
```

### Pattern 2: Balanced Assistant

```typescript
{
	temperature: 0.7,  // Some variety
	// Helpful system prompt
}
```

### Pattern 3: Creative Generation

```typescript
{
	temperature: 1.5,  // High creativity
	// Encouraging system prompt
}
```

---

## Debugging Tips

### Issue: Inconsistent Results

```typescript
// Before
temperature: 1.0

// After
temperature: 0.1  // Much more consistent
```

### Issue: Too Boring/Repetitive

```typescript
// Before
temperature: 0.0

// After
temperature: 0.7  // More variety
```

### Issue: Too Random/Unreliable

```typescript
// Before
temperature: 2.0

// After
temperature: 0.8  // More controlled
```

---

## What's Next?

You now understand:
- ✅ System prompts - Guiding AI behavior
- ✅ Temperature - Controlling randomness
- ✅ How they work together

Next up:
- **Few-Shot Prompting** - Teaching by example
- **Prompt Engineering Patterns** - Advanced techniques

---

## Quick Reference

**System Prompt Structure:**
```typescript
const SYSTEM_PROMPT = `
You are [role].

[Context/background]

Your task:
1. [Step 1]
2. [Step 2]
3. [Step 3]

[Constraints/requirements]
`;
```

**Temperature Guide:**
| Temperature | Use Case                   | Example                        |
| ----------- | -------------------------- | ------------------------------ |
| 0.0 - 0.3   | Classification, routing    | Agent selection, data extraction |
| 0.7 - 1.0   | General Q&A, chat          | Customer support, tutoring     |
| 1.5 - 2.0   | Creative writing           | Poetry, brainstorming          |

**API Call:**
```typescript
await openaiClient.responses.parse({
	model: 'gpt-4o-mini',
	temperature: 0.1,
	input: [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'user', content: query },
	],
});
```

---

## Further Reading

- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [Temperature Explained](https://platform.openai.com/docs/api-reference/chat/create#temperature)
- [System Message Guidelines](https://platform.openai.com/docs/guides/prompt-engineering/strategy-write-clear-instructions)

---

## Video Walkthrough

Watch me explain system prompts and temperature with live experiments:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/system-prompts-temperature" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
