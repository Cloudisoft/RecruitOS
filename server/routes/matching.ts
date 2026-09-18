import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { openai, isOpenAIConfigured, CHAT_MODEL } from '../lib/openai.js'

export const matchingRouter = Router()

const SYSTEM_PROMPT = `You are a technical recruiter's assistant. You are given a job requirement and a shortlist of bench candidates with their real skills/experience data, ALREADY pre-filtered by a rule-based skill/location/availability matcher. Your job is only to explain, in plain language, why each candidate is or isn't a good fit, and flag genuine concerns (e.g. visa mismatch, rate mismatch, thin experience in a required skill). Do NOT invent qualifications, experience, or skills not present in the candidate data. Do NOT change the ranking order. Respond with strict JSON: { "explanations": [{ "candidate_id": string, "summary": string, "concerns": string[] }] }`

matchingRouter.post('/explain', async (req: AuthedRequest, res) => {
  if (!isOpenAIConfigured || !openai) {
    res.status(503).json({ error: 'AI-enhanced matching is not configured on this server. Set OPENAI_API_KEY. Rule-based matching still works without it.' })
    return
  }
  const { jobId, candidateIds } = req.body as { jobId?: string; candidateIds?: string[] }
  if (!jobId || !candidateIds?.length) {
    res.status(400).json({ error: 'jobId and candidateIds are required' })
    return
  }

  const { data: job, error: jobError } = await supabaseAdmin.from('jobs').select('*').eq('id', jobId).eq('org_id', req.user!.org_id).single()
  if (jobError || !job) {
    res.status(404).json({ error: 'Job not found' })
    return
  }

  const { data: candidates, error: candError } = await supabaseAdmin
    .from('candidates')
    .select('id, first_name, last_name, primary_skill, secondary_skills, total_experience_years, work_authorization, expected_rate, preferred_work_mode, status')
    .in('id', candidateIds)
    .eq('org_id', req.user!.org_id)
  if (candError) {
    res.status(500).json({ error: candError.message })
    return
  }

  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Job:\n${JSON.stringify(job)}\n\nShortlisted candidates:\n${JSON.stringify(candidates)}` },
      ],
    })
    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenAI')
    res.json(JSON.parse(content))
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Matching explanation failed' })
  }
})
