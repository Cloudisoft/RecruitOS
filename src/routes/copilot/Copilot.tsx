import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/apiClient'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Input'
import { Bot, User, Send, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Show me all candidates on bench for more than 30 days.',
  'Which submissions need follow-up today?',
  'Show me my pending tasks.',
  'Which companies have not been contacted in 14 days?',
]

export function Copilot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const statusQ = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => api.get<{ openai: boolean }>('/status'),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const message = (text ?? input).trim()
    if (!message || sending) return
    setInput('')
    const history = [...messages, { role: 'user' as const, content: message }]
    setMessages(history)
    setSending(true)
    try {
      const res = await api.post<{ reply: string }>('/copilot/chat', { message, history: messages })
      setMessages([...history, { role: 'assistant', content: res.reply }])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Copilot request failed'
      setMessages([...history, { role: 'assistant', content: `⚠️ ${msg}` }])
    } finally {
      setSending(false)
    }
  }

  const notConfigured = statusQ.data && !statusQ.data.openai

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="AI Copilot" description="Ask questions about your candidates, submissions, and tasks — scoped to what you can see" />

      {notConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-sm text-yellow-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>AI Copilot is not configured on this server. Set OPENAI_API_KEY in the backend environment to enable it.</span>
        </div>
      )}

      <div className="flex flex-1 flex-col rounded-xl border border-[#e5e7eb] bg-[#ffffff]">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Bot className="h-10 w-10 text-orange-500/60" />
              <p className="text-sm text-gray-500">Ask me anything about your candidates, submissions, or tasks.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-[#d1d5db] px-3 py-1.5 text-xs text-gray-600 hover:border-orange-500/50 hover:text-orange-700">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={clsx('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
              <div className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-orange-500/20 text-orange-700' : 'bg-blue-500/20 text-blue-700')}>
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={clsx('max-w-[75%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap', m.role === 'user' ? 'bg-orange-500/10 text-gray-900' : 'bg-[#f1f5f9] text-gray-800')}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-end gap-2 border-t border-[#e5e7eb] p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask the copilot…"
            className="min-h-[44px] flex-1"
          />
          <Button onClick={() => send()} loading={sending} disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  )
}
