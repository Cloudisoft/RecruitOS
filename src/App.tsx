import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { Login } from './routes/Login'
import { Signup } from './routes/Signup'
import { Dashboard } from './routes/Dashboard'
import { LeadsList } from './routes/leads/LeadsList'
import { LeadDetail } from './routes/leads/LeadDetail'
import { ContactsList } from './routes/contacts/ContactsList'
import { ContactDetail } from './routes/contacts/ContactDetail'
import { CompaniesList } from './routes/companies/CompaniesList'
import { CompanyDetail } from './routes/companies/CompanyDetail'
import { Pipeline } from './routes/pipeline/Pipeline'
import { OpportunityDetail } from './routes/pipeline/OpportunityDetail'
import { CandidatesList } from './routes/candidates/CandidatesList'
import { CandidateDetail } from './routes/candidates/CandidateDetail'
import { JobsList } from './routes/jobs/JobsList'
import { JobDetail } from './routes/jobs/JobDetail'
import { SubmissionsList } from './routes/submissions/SubmissionsList'
import { TasksBoard } from './routes/tasks/TasksBoard'
import { OrganizationSettings } from './routes/settings/OrganizationSettings'
import { TeamSettings } from './routes/settings/TeamSettings'
import { AuditLogs } from './routes/settings/AuditLogs'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ style: { background: '#16171d', color: '#e5e7eb', border: '1px solid #26272f' } }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/leads" element={<LeadsList />} />
              <Route path="/leads/:id" element={<LeadDetail />} />

              <Route path="/contacts" element={<ContactsList />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />

              <Route path="/companies" element={<CompaniesList />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />

              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/pipeline/:id" element={<OpportunityDetail />} />

              <Route path="/candidates" element={<CandidatesList />} />
              <Route path="/candidates/:id" element={<CandidateDetail />} />

              <Route path="/jobs" element={<JobsList />} />
              <Route path="/jobs/:id" element={<JobDetail />} />

              <Route path="/submissions" element={<SubmissionsList />} />

              <Route path="/tasks" element={<TasksBoard />} />

              <Route path="/settings/organization" element={<OrganizationSettings />} />
              <Route path="/settings/team" element={<TeamSettings />} />
              <Route path="/settings/audit-logs" element={<ProtectedRoute requireRole={['admin', 'global_admin']}><AuditLogs /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
