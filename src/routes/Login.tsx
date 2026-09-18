import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { isSupabaseConfigured } from '../lib/supabase'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import logo from '../assets/logo.webp'

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
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt="RecruitOS — From Talent to Tomorrow" className="h-24 w-auto object-contain" />
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-3 text-xs text-yellow-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file before signing in.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-6">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          No account? <Link to="/signup" state={{ from: location.state?.from }} className="text-orange-600 hover:underline">Create an organization</Link>
        </p>
      </div>
    </div>
  )
}
