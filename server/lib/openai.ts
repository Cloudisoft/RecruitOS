import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

export const isOpenAIConfigured = Boolean(apiKey)

if (!isOpenAIConfigured) {
  // eslint-disable-next-line no-console
  console.warn('[server] OPENAI_API_KEY not set — Resume AI, Copilot, and AI matching endpoints will report "not configured".')
}

export const openai = isOpenAIConfigured ? new OpenAI({ apiKey }) : null

export const CHAT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
