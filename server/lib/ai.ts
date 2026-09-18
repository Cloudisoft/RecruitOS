import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Provider-agnostic AI layer. Select which provider is active via
 * AI_PROVIDER=openai|anthropic (defaults to openai). Both SDKs are wired up
 * whenever their key is present, but only the active provider is used for
 * requests — this lets an org configure either (or swap later) without
 * touching route code.
 */
const provider = ((process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'anthropic')

const openaiKey = process.env.OPENAI_API_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY

const openaiClient = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null
const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null

export const activeProvider = provider
export const isAIConfigured = provider === 'anthropic' ? Boolean(anthropicClient) : Boolean(openaiClient)

if (!isAIConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    `[server] AI provider "${provider}" has no API key set (${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}) — Resume AI, Copilot, and AI matching endpoints will report "not configured".`
  )
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5'

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenced ? fenced[1] : text).trim()
}

/** Single JSON-structured completion. Throws if the provider isn't configured. */
export async function completeJson(system: string, user: string): Promise<unknown> {
  if (provider === 'anthropic') {
    if (!anthropicClient) throw new Error('AI provider not configured')
    const response = await anthropicClient.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: `${system}\n\nRespond with ONLY valid JSON — no markdown code fences, no commentary before or after.`,
      messages: [{ role: 'user', content: user }],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('Empty response from Claude')
    return JSON.parse(stripCodeFence(textBlock.text))
  }

  if (!openaiClient) throw new Error('AI provider not configured')
  const completion = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  return JSON.parse(content)
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Multi-turn plain-text completion (used by the Copilot chat). */
export async function completeChat(system: string, turns: ChatTurn[]): Promise<string> {
  if (provider === 'anthropic') {
    if (!anthropicClient) throw new Error('AI provider not configured')
    const response = await anthropicClient.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system,
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock && textBlock.type === 'text' ? textBlock.text : '(no response)'
  }

  if (!openaiClient) throw new Error('AI provider not configured')
  const completion = await openaiClient.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'system', content: system }, ...turns],
  })
  return completion.choices[0]?.message?.content ?? '(no response)'
}
