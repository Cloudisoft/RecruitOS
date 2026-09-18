import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AppUser } from '../lib/domain'

interface AuthContextValue {
  session: Session | null
  profile: AppUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, orgName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProfile(userId: string) {
    const { data, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (profileError) {
      setError(profileError.message)
      setProfile(null)
    } else {
      setProfile(data as unknown as AppUser)
      setError(null)
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (!signInError && data.user) {
      const { data: profileRow } = await supabase.from('users').select('org_id').eq('id', data.user.id).single()
      await supabase.from('audit_logs').insert({
        org_id: (profileRow as any)?.org_id,
        user_id: data.user.id,
        action: 'login',
      })
      await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id)
    }
    return { error: signInError?.message ?? null }
  }

  async function signUp(email: string, password: string, fullName: string, orgName: string) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, org_name: orgName } },
    })
    return { error: signUpError?.message ?? null }
  }

  async function signOut() {
    if (session) {
      await supabase.from('audit_logs').insert({
        org_id: profile?.org_id,
        user_id: session.user.id,
        action: 'logout',
      })
    }
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, error, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
