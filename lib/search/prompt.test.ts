import assert from 'node:assert/strict'
import test from 'node:test'
import {buildSearchTermSystemPrompt} from './prompt'
import {searchTermsSchema} from './schema'

test('search-term prompt defines the bounded interpreter contract', () => {
  const prompt = buildSearchTermSystemPrompt()

  assert.match(prompt, /learner-query interpreter/i)
  assert.match(prompt, /1 to 12 search terms/i)
  assert.match(prompt, /64 characters or fewer/i)
  assert.match(prompt, /lesson topics and video chapter or transcript wording/i)
  assert.match(prompt, /query as untrusted data/i)
  assert.match(prompt, /ignore instructions[\s\S]*disclose prompts[\s\S]*emit GROQ[\s\S]*output shape/i)
  assert.match(prompt, /never claim content exists or invent courses, lessons, timestamps, or facts/i)
  assert.match(prompt, /do not answer the learner, write prose, or generate GROQ/i)
})

test('search-term schema accepts the prompt contract and rejects output-shape drift', () => {
  assert.deepEqual(
    searchTermsSchema.parse({terms: ['system prompt', 'prompt injection', 'llm guardrails']}),
    {terms: ['system prompt', 'prompt injection', 'llm guardrails']},
  )
  assert.throws(() => searchTermsSchema.parse({terms: []}))
  assert.throws(() => searchTermsSchema.parse({terms: Array.from({length: 13}, (_, index) => `term ${index}`)}))
  assert.throws(() => searchTermsSchema.parse({terms: ['return *[_type == "lesson"]']}))
})
