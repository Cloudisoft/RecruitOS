import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function Signup() {
  const { signUp, session } = useAuth()
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUp(email, password, fullName, orgName)
    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      setDone(true)
      toast.success('Account created. Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0c0f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-lg font-bold text-white">R</div>
          <h1 className="text-lg font-semibold text-gray-100">Create your organization</h1>
          <p className="text-sm text-gray-500">You'll be the first Admin</p>
        </div>

        {done ? (
          <div className="rounded-xl border border-[#22232b] bg-[#14151a] p-6 text-center text-sm text-gray-300">
            Account created. Please confirm your email, then{' '}
            <Link to="/login" className="text-orange-400 hover:underline">sign in</Link>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#22232b] bg-[#14151a] p-6">
            <Input label="Organization name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Staffing" />
            <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <Input label="Password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-orange-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
