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
import { InterviewsList } from './routes/interviews/InterviewsList'
import { OffersList } from './routes/offers/OffersList'
import { BackgroundChecksList } from './routes/backgroundchecks/BackgroundChecksList'
import { PlacementsList } from './routes/placements/PlacementsList'
import { ProjectsList } from './routes/projects/ProjectsList'
import { ProjectDetail } from './routes/projects/ProjectDetail'
import { InvoicesList } from './routes/invoices/InvoicesList'
import { RevenuePage } from './routes/invoices/RevenuePage'
import { Reports } from './routes/reports/Reports'
import { Copilot } from './routes/copilot/Copilot'
import { ResumeAILanding } from './routes/resumeai/ResumeAILanding'
import { CandidateMatching } from './routes/matching/CandidateMatching'
import { AutomationBuilder } from './routes/automation/AutomationBuilder'
import { OrganizationSettings } from './routes/settings/OrganizationSettings'
import { TeamSettings } from './routes/settings/TeamSettings'
import { AuditLogs } from './routes/settings/AuditLogs'
import { EmailSettings } from './routes/settings/EmailSettings'
import { Integrations } from './routes/settings/Integrations'
import { Billing } from './routes/settings/Billing'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ style: { background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } }} />
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

              <Route path="/interviews" element={<InterviewsList />} />
              <Route path="/offers" element={<OffersList />} />
              <Route path="/background-checks" element={<BackgroundChecksList />} />
              <Route path="/placements" element={<ProtectedRoute requireRole={['admin', 'global_admin']}><PlacementsList /></ProtectedRoute>} />

              <Route path="/copilot" element={<Copilot />} />
              <Route path="/resume-ai" element={<ResumeAILanding />} />
              <Route path="/matching" element={<CandidateMatching />} />
              <Route path="/reports" element={<Reports />} />

              <Route path="/projects" element={<ProjectsList />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/tasks" element={<TasksBoard />} />

              <Route path="/invoices" element={<InvoicesList />} />
              <Route path="/revenue" element={<RevenuePage />} />

              <Route path="/automation" element={<ProtectedRoute requireRole={['admin', 'global_admin']}><AutomationBuilder /></ProtectedRoute>} />

              <Route path="/settings/organization" element={<OrganizationSettings />} />
              <Route path="/settings/team" element={<TeamSettings />} />
              <Route path="/settings/email" element={<EmailSettings />} />
              <Route path="/settings/integrations" element={<ProtectedRoute requireRole={['admin', 'global_admin']}><Integrations /></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute requireRole={['admin', 'global_admin']}><Billing /></ProtectedRoute>} />
              <Route path="/settings/audit-logs" element={<ProtectedRoute requireRole={['admin', 'global_admin']}><AuditLogs /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
