import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingState } from './ui/States'
import type { AppRole } from '../lib/domain'

export function ProtectedRoute({ children, requireRole }: { children: React.ReactNode; requireRole?: AppRole[] }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingState label="Loading RecruitOS…" />
  if (!session) return <Navigate to="/login" replace />
  if (requireRole && profile && !requireRole.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
