import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { openai, isOpenAIConfigured, CHAT_MODEL } from '../lib/openai.js'

export const copilotRouter = Router()

const SYSTEM_PROMPT = `You are the AI Copilot inside RecruitOS, a bench sales recruitment CRM. You answer the recruiter's question using ONLY the JSON data snapshot provided to you in this message — it has already been scoped to what this user is allowed to see (their organization, and for non-admins, only records they own or are assigned to). Never claim knowledge beyond that snapshot. If the data needed to answer isn't in the snapshot, say so plainly instead of guessing. Be concise and specific — reference candidate/company/job names from the data. Do not fabricate rates, dates, or statuses.`

/**
 * Builds an RBAC-scoped snapshot of the org's data for the copilot to reason
 * over. Plain "user" role only sees rows they own/are assigned to, matching
 * the same ownership rules as the Postgres RLS policies (recruiter_owner_id,
 * owner_id, assignee_id, etc.) — this mirrors RLS in application code since
 * the service-role client bypasses RLS by design.
 */
async function buildContextSnapshot(user: NonNullable<AuthedRequest['user']>) {
  const isPrivileged = user.role === 'admin' || user.role === 'global_admin'

  let candidatesQuery = supabaseAdmin
    .from('candidates')
    .select('id, first_name, last_name, primary_skill, status, bench_status, bench_start_date, recruiter_owner_id, work_authorization')
    .eq('org_id', user.org_id)
    .limit(200)
  if (!isPrivileged) candidatesQuery = candidatesQuery.eq('recruiter_owner_id', user.id)

  let submissionsQuery = supabaseAdmin
    .from('submissions')
    .select('id, candidate_id, job_id, status, follow_up_at, submitted_by')
    .eq('org_id', user.org_id)
    .limit(200)
  if (!isPrivileged) submissionsQuery = submissionsQuery.eq('submitted_by', user.id)

  let interviewsQuery = supabaseAdmin
    .from('interviews')
    .select('id, candidate_id, job_id, scheduled_at, status, round')
    .eq('org_id', user.org_id)
    .gte('scheduled_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .limit(100)

  let tasksQuery = supabaseAdmin
    .from('tasks')
    .select('id, title, status, priority, due_date, assignee_id')
    .eq('org_id', user.org_id)
    .neq('status', 'done')
    .limit(100)
  if (!isPrivileged) tasksQuery = tasksQuery.eq('assignee_id', user.id)

  let companiesQuery = supabaseAdmin
    .from('companies')
    .select('id, name, status, account_owner_id, updated_at')
    .eq('org_id', user.org_id)
    .limit(200)
  if (!isPrivileged) companiesQuery = companiesQuery.eq('account_owner_id', user.id)

  const [candidates, submissions, interviews, tasks, companies] = await Promise.all([
    candidatesQuery, submissionsQuery, interviewsQuery, tasksQuery, companiesQuery,
  ])

  return {
    scope: isPrivileged ? 'organization-wide' : 'records owned by or assigned to this user only',
    today: new Date().toISOString().slice(0, 10),
    candidates: candidates.data ?? [],
    submissions: submissions.data ?? [],
    upcoming_interviews: interviews.data ?? [],
    pending_tasks: tasks.data ?? [],
    companies: companies.data ?? [],
  }
}

copilotRouter.post('/chat', async (req: AuthedRequest, res) => {
  if (!isOpenAIConfigured || !openai) {
    res.status(503).json({ error: 'AI Copilot is not configured on this server. Set OPENAI_API_KEY.' })
    return
  }
  const { message, history } = req.body as { message?: string; history?: { role: 'user' | 'assistant'; content: string }[] }
  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  try {
    const snapshot = await buildContextSnapshot(req.user!)
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `Data snapshot (JSON):\n${JSON.stringify(snapshot)}` },
        ...(history ?? []).slice(-10),
        { role: 'user', content: message },
      ],
    })
    const reply = completion.choices[0]?.message?.content ?? '(no response)'
    res.json({ reply })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Copilot request failed' })
  }
})
