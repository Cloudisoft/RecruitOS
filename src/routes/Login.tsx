import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { isSupabaseConfigured } from '../lib/supabase'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export function Login() {
  const { signIn, session } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) toast.error(error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0c0f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg font-bold text-white">R</div>
          <h1 className="text-lg font-semibold text-gray-100">RecruitOS</h1>
          <p className="text-sm text-gray-500">Bench Sales Recruitment CRM</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file before signing in.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#22232b] bg-[#14151a] p-6">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          No account? <Link to="/signup" state={{ from: location.state?.from }} className="text-orange-400 hover:underline">Create an organization</Link>
        </p>
      </div>
    </div>
  )
}
