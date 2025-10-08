# Testing the Selector Agent

The selector agent is critical to your RAG system - it routes queries to the right specialized agent. In this module, you'll learn how to test it effectively using structured output validation.

---

## What You'll Learn

- Why testing AI agents is critical
- How to test structured output with Zod schemas
- Writing effective test cases for agent routing
- Handling edge cases and unsupported queries

---

## Why Test AI Agents?

### The Challenge with AI Testing

AI outputs are non-deterministic, but that doesn't mean we can't test them!

**What we CAN'T test:**
- ❌ Exact output text (changes every time)
- ❌ Creative responses (vary with temperature)

**What we CAN test:**
- ✅ Output structure (JSON schema)
- ✅ Agent selection logic (LinkedIn vs Knowledge Base)
- ✅ Error handling (invalid inputs)
- ✅ Response time (performance)

---

## Understanding the Selector Agent

### How It Works

```
User Query
    ↓
Selector Agent (gpt-4o-mini + structured output)
    ↓
Returns: { selectedAgent, agentQuery, model }
    ↓
Routes to LinkedIn or Knowledge Base agent
```

### The Structured Output

Using Zod schema ensures consistent JSON responses:

```typescript
export const agentResponseSchema = z.object({
	selectedAgent: agentSchema, // 'linkedin' | 'knowledgeBase'
	agentQuery: z.string(),     // Refined query for the agent
});
```

**Why Zod + Structured Output?**
- Guarantees valid JSON (no parsing errors)
- Type-safe responses
- Schema validation at runtime
- OpenAI enforces the schema

---

## Current Test Suite

Let's examine the existing tests in `app/libs/openai/agents/__tests__/selector-agent.test.ts`:

```typescript
describe('selectAgent', () => {
	const testCases = [
		{
			name: 'should select LinkedIn agent for LinkedIn-related queries',
			query: 'Write a LinkedIn post about learning JavaScript',
			expectedAgent: 'linkedin',
			expectedModel: AGENT_CONFIG.linkedin.model,
		},
		{
			name: 'should select Knowledge Base agent for coding queries',
			query: 'Why are enums in TypeScript useful?',
			expectedAgent: 'knowledgeBase',
			expectedModel: AGENT_CONFIG.knowledgeBase.model,
		},
	];

	testCases.forEach(({ name, query, expectedAgent, expectedModel }) => {
		it(name, async () => {
			const result = await selectAgent(query);
			expect(result.selectedAgent).toBe(expectedAgent);
			expect(result.model).toBe(expectedModel);
		});
	});
});
```

### Running the Tests

```bash
yarn test selector-agent
```

**Expected output:**
```
PASS app/libs/openai/agents/__tests__/selector-agent.test.ts
  selectAgent
    ✓ should select LinkedIn agent for LinkedIn-related queries (2007 ms)
    ✓ should select Knowledge Base agent for coding queries (1046 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

---

## Your Challenge: Add More Test Cases

The current tests only cover 2 scenarios. Your job is to expand test coverage!

### Challenge 1: Add Edge Cases

Add tests for queries that might confuse the selector:

```typescript
// TODO: Add this test case
{
	name: 'should handle ambiguous queries',
	query: 'Tell me about JavaScript',
	// Could be either agent - verify it picks one consistently
	expectedAgent: ???, // You decide!
}
```

### Challenge 2: Test Query Refinement

The selector can refine queries. Test this behavior:

```typescript
it('should refine vague queries', async () => {
	const result = await selectAgent('How do I do that thing?');

	// The refined query should be more specific
	expect(result.agentQuery.length).toBeGreaterThan(20);

	// Should still be related to original query
	expect(result.agentQuery.toLowerCase()).toContain('thing');
});
```

### Challenge 3: Test Unsupported Queries

**NOTE from tests:** There's a TODO comment:
```typescript
// TODO: add some test for queries which should NOT be supported
```

Add tests for queries that shouldn't be handled:

```typescript
const unsupportedQueries = [
	'What is the weather today?',           // Not in knowledge base
	'Book me a flight to Paris',            // Action request
	'Translate this to Spanish: Hello',     // Translation
	'What is 2 + 2?',                       // Basic math
];

unsupportedQueries.forEach(query => {
	it(`should handle unsupported query: "${query}"`, async () => {
		const result = await selectAgent(query);

		// Verify it picks an agent (doesn't error)
		expect(result.selectedAgent).toBeTruthy();

		// Optional: log for manual review
		console.log(`"${query}" → ${result.selectedAgent}`);
	});
});
```

### Challenge 4: Test Performance

AI calls can be slow. Test that responses are reasonable:

```typescript
it('should respond within acceptable time', async () => {
	const start = Date.now();

	await selectAgent('Write a LinkedIn post about AI');

	const duration = Date.now() - start;

	// Should respond in under 5 seconds
	expect(duration).toBeLessThan(5000);
}, 10000); // 10s timeout for the test itself
```

### Challenge 5: Test LinkedIn Detection

LinkedIn queries should be reliably detected:

```typescript
const linkedInQueries = [
	'Write a LinkedIn post about TypeScript',
	'Help me improve my LinkedIn profile',
	'Create a professional summary for LinkedIn',
	'What should I post on LinkedIn about my new job?',
];

linkedInQueries.forEach(query => {
	it(`should route LinkedIn query to LinkedIn agent: "${query}"`, async () => {
		const result = await selectAgent(query);
		expect(result.selectedAgent).toBe('linkedin');
	});
});
```

### Challenge 6: Test Knowledge Base Detection

Technical queries should go to knowledge base:

```typescript
const knowledgeBaseQueries = [
	'How do React hooks work?',
	'Explain async/await in JavaScript',
	'What are the benefits of TypeScript?',
	'How do I use useState?',
];

knowledgeBaseQueries.forEach(query => {
	it(`should route technical query to knowledge base: "${query}"`, async () => {
		const result = await selectAgent(query);
		expect(result.selectedAgent).toBe('knowledgeBase');
	});
});
```

---

## Testing Structured Output

The selector uses OpenAI's structured output feature. Let's verify it works:

### Test 1: Schema Compliance

```typescript
it('should return response matching schema', async () => {
	const result = await selectAgent('Any query here');

	// Validate against Zod schema
	const validation = agentResponseSchema.safeParse({
		selectedAgent: result.selectedAgent,
		agentQuery: result.agentQuery,
	});

	expect(validation.success).toBe(true);
});
```

### Test 2: Valid Agent Types

```typescript
it('should only return valid agent types', async () => {
	const queries = [
		'LinkedIn post about AI',
		'How does useEffect work?',
		'Tell me about JavaScript',
	];

	for (const query of queries) {
		const result = await selectAgent(query);

		// Must be one of the defined agent types
		expect(['linkedin', 'knowledgeBase']).toContain(result.selectedAgent);
	}
});
```

### Test 3: Non-Empty Refined Query

```typescript
it('should always return a refined query', async () => {
	const result = await selectAgent('Help me');

	expect(result.agentQuery).toBeTruthy();
	expect(result.agentQuery.length).toBeGreaterThan(0);
});
```

---

## Debugging Failed Tests

If tests fail, here's how to debug:

### 1. Check API Keys

```bash
# Verify OpenAI key is set
echo $OPENAI_API_KEY
```

### 2. Inspect Test Output

Add logging to see what the selector returns:

```typescript
it('debug test', async () => {
	const result = await selectAgent('Your query here');

	console.log('Selected agent:', result.selectedAgent);
	console.log('Refined query:', result.agentQuery);
	console.log('Model:', result.model);

	// Your assertions here
});
```

### 3. Run Tests with Verbose Output

```bash
yarn test selector-agent --verbose
```

### 4. Test Timeout Issues

AI tests can be slow. Increase timeout if needed:

```typescript
it('slow test', async () => {
	// Test code here
}, 15000); // 15 second timeout
```

---

## Common Issues

**❌ "Timeout of 5000ms exceeded"**
→ Increase test timeout or check OpenAI API connection

**❌ "OPENAI_API_KEY is missing"**
→ Check `.env` file exists and is loaded

**❌ "Failed to parse response"**
→ Check OpenAI API status, might be rate limited

**❌ "Unexpected agent selected"**
→ AI is non-deterministic; consider if your test assumption is correct

---

## Best Practices for AI Testing

### ✅ DO:
- Test structure, not exact content
- Use generous timeouts
- Test multiple similar queries
- Log unexpected results for analysis
- Use structured output for consistency

### ❌ DON'T:
- Expect exact text matches
- Test too frequently (rate limits!)
- Assume deterministic behavior
- Skip error handling tests
- Forget to mock in CI/CD (use recorded responses)

---

## Your Assignment

Complete these tasks:

**Task 1:** Run existing tests
```bash
yarn test selector-agent
```
Verify they pass ✅

**Task 2:** Add 5 new test cases
- At least 2 for LinkedIn queries
- At least 2 for Knowledge Base queries
- At least 1 edge case

**Task 3:** Add unsupported query tests
- Implement the TODO comment
- Test queries outside your domain

**Task 4:** Add performance test
- Measure response time
- Set reasonable threshold

**Task 5:** Run full test suite
```bash
yarn test selector-agent
```
All tests should pass ✅

---

## Example: Complete Test Suite

Here's what your expanded test file might look like:

```typescript
import { selectAgent } from '../selector-agent';
import { AGENT_CONFIG } from '../types';

describe('selectAgent', () => {
	// Basic functionality
	describe('Basic Agent Selection', () => {
		const testCases = [
			{
				name: 'should select LinkedIn agent for LinkedIn-related queries',
				query: 'Write a LinkedIn post about learning JavaScript',
				expectedAgent: 'linkedin',
			},
			{
				name: 'should select Knowledge Base agent for coding queries',
				query: 'Why are enums in TypeScript useful?',
				expectedAgent: 'knowledgeBase',
			},
		];

		testCases.forEach(({ name, query, expectedAgent }) => {
			it(name, async () => {
				const result = await selectAgent(query);
				expect(result.selectedAgent).toBe(expectedAgent);
			}, 10000);
		});
	});

	// Schema validation
	describe('Structured Output Validation', () => {
		it('should return valid schema', async () => {
			const result = await selectAgent('Any query');
			expect(result).toHaveProperty('selectedAgent');
			expect(result).toHaveProperty('agentQuery');
			expect(result).toHaveProperty('model');
		}, 10000);
	});

	// Edge cases
	describe('Edge Cases', () => {
		it('should handle empty query', async () => {
			const result = await selectAgent('');
			expect(result.selectedAgent).toBeTruthy();
		}, 10000);

		it('should handle very long query', async () => {
			const longQuery = 'word '.repeat(500);
			const result = await selectAgent(longQuery);
			expect(result.selectedAgent).toBeTruthy();
		}, 10000);
	});

	// Performance
	describe('Performance', () => {
		it('should respond quickly', async () => {
			const start = Date.now();
			await selectAgent('Quick test');
			const duration = Date.now() - start;
			expect(duration).toBeLessThan(5000);
		}, 10000);
	});
});
```

---

## What's Next?

Congratulations! You now have:
- ✅ Observability with Helicone
- ✅ Comprehensive agent selector tests
- ✅ Confidence in your routing logic

Next steps:
1. **Deploy to production** with monitoring
2. **Analyze usage patterns** from Helicone
3. **Optimize based on data** (costs, performance)
4. **Add more agents** as needed

---

## Quick Reference

**Run tests:**
```bash
yarn test selector-agent
```

**Run with verbose output:**
```bash
yarn test selector-agent --verbose
```

**Run specific test:**
```bash
yarn test selector-agent -t "should select LinkedIn agent"
```

**Watch mode:**
```bash
yarn test selector-agent --watch
```

---

## Video Walkthrough

Watch me write tests for the selector agent:

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/testing-selector-agent" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
