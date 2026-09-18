import { Router } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { openai, isOpenAIConfigured, CHAT_MODEL } from '../lib/openai.js'
import { extractText } from '../lib/textExtract.js'

export const resumeRouter = Router()

const PARSE_SYSTEM_PROMPT = `You are a resume parsing assistant for a US IT staffing recruiter. Extract ONLY information that is explicitly present in the resume text. Never invent employers, titles, dates, degrees, certifications, or skills that are not written in the text. If a field is not present, omit it or use null. Respond with strict JSON matching this shape:
{
  "full_name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "skills": string[],
  "technical_skills": string[],
  "work_authorization": string | null,
  "experience": [{ "employer": string, "title": string, "start_date": string|null, "end_date": string|null, "description": string|null, "technologies": string[] }],
  "education": [{ "degree": string, "institution": string, "field_of_study": string|null, "start_year": number|null, "end_year": number|null }],
  "certifications": [{ "name": string, "issuer": string|null, "issued_date": string|null }]
}`

const ANALYSIS_SYSTEM_PROMPT = `You are a resume reviewer for a US IT staffing recruiter, comparing a resume against a target job description (if provided). Only point out issues actually present in the given text — never fabricate missing experience the candidate might have. Respond with strict JSON:
{
  "missing_skills": string[],
  "weak_sections": string[],
  "formatting_issues": string[],
  "ats_issues": string[],
  "experience_gaps": string[],
  "missing_keywords": string[],
  "overall_score": number
}`

const ENHANCE_SYSTEM_PROMPT = `You are a resume editor for a US IT staffing recruiter. You may rephrase, reorganize, and tighten wording for clarity and ATS-friendliness, and reorder/emphasize existing bullet points relevant to a target role. You must NEVER invent, add, or imply any employer, job title, employment date, degree, certification, project, or skill that is not already present in the candidate's original resume data provided to you. If asked to strengthen a section but there is no underlying content to draw from, leave it unchanged rather than fabricating content. Respond with strict JSON matching the same shape as the input "resume" object, with only wording-level edits.`

function requireOpenAI(res: any) {
  if (!isOpenAIConfigured || !openai) {
    res.status(503).json({ error: 'OpenAI is not configured on this server. Set OPENAI_API_KEY.' })
    return false
  }
  return true
}

async function jsonCompletion(system: string, user: string) {
  const completion = await openai!.chat.completions.create({
    model: CHAT_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  return JSON.parse(content)
}

// POST /api/resume/parse { candidateId, documentId }
resumeRouter.post('/parse', async (req: AuthedRequest, res) => {
  if (!requireOpenAI(res)) return
  const { candidateId, documentId } = req.body as { candidateId?: string; documentId?: string }
  if (!candidateId || !documentId) {
    res.status(400).json({ error: 'candidateId and documentId are required' })
    return
  }

  const { data: doc, error: docError } = await supabaseAdmin
    .from('candidate_documents')
    .select('*')
    .eq('id', documentId)
    .eq('org_id', req.user!.org_id)
    .single()
  if (docError || !doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('candidate-documents')
    .download(doc.storage_path)
  if (downloadError || !fileData) {
    res.status(500).json({ error: downloadError?.message ?? 'Could not download document' })
    return
  }

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const rawText = await extractText(buffer, doc.file_name)
    if (!rawText.trim()) {
      res.status(422).json({ error: 'Could not extract any text from this file.' })
      return
    }

    const parsed = await jsonCompletion(PARSE_SYSTEM_PROMPT, rawText.slice(0, 15000))

    const { data: resume, error: resumeError } = await supabaseAdmin
      .from('resumes')
      .insert({
        org_id: req.user!.org_id,
        candidate_id: candidateId,
        source_document_id: documentId,
        parsed_data: parsed,
        raw_text: rawText.slice(0, 20000),
      })
      .select()
      .single()
    if (resumeError) throw resumeError

    await supabaseAdmin.from('activities').insert({
      org_id: req.user!.org_id,
      entity_type: 'candidate',
      entity_id: candidateId,
      type: 'resume_generated',
      summary: 'Resume parsed by AI',
      actor_id: req.user!.id,
    })

    res.json({ resume })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Resume parsing failed' })
  }
})

// POST /api/resume/analyze { resumeId, targetJobDescription? }
resumeRouter.post('/analyze', async (req: AuthedRequest, res) => {
  if (!requireOpenAI(res)) return
  const { resumeId, targetJobDescription } = req.body as { resumeId?: string; targetJobDescription?: string }
  if (!resumeId) {
    res.status(400).json({ error: 'resumeId is required' })
    return
  }
  const { data: resume, error } = await supabaseAdmin.from('resumes').select('*').eq('id', resumeId).eq('org_id', req.user!.org_id).single()
  if (error || !resume) {
    res.status(404).json({ error: 'Resume not found' })
    return
  }

  try {
    const userPrompt = `Resume data:\n${JSON.stringify(resume.parsed_data)}\n\nTarget job description:\n${targetJobDescription || '(none provided — do a general ATS/quality review)'}`
    const analysis = await jsonCompletion(ANALYSIS_SYSTEM_PROMPT, userPrompt)

    const { error: updateError } = await supabaseAdmin.from('resumes').update({ analysis }).eq('id', resumeId)
    if (updateError) throw updateError

    res.json({ analysis })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Resume analysis failed' })
  }
})

// POST /api/resume/enhance { resumeId, instructions? } -> returns a DRAFT for recruiter approval, does not save
resumeRouter.post('/enhance', async (req: AuthedRequest, res) => {
  if (!requireOpenAI(res)) return
  const { resumeId, instructions } = req.body as { resumeId?: string; instructions?: string }
  if (!resumeId) {
    res.status(400).json({ error: 'resumeId is required' })
    return
  }
  const { data: resume, error } = await supabaseAdmin.from('resumes').select('*').eq('id', resumeId).eq('org_id', req.user!.org_id).single()
  if (error || !resume) {
    res.status(404).json({ error: 'Resume not found' })
    return
  }

  try {
    const userPrompt = `Original resume data (the ONLY source of truth — do not add anything beyond this):\n${JSON.stringify(resume.parsed_data)}\n\nRecruiter instructions: ${instructions || 'Improve clarity and ATS-friendliness.'}`
    const enhanced = await jsonCompletion(ENHANCE_SYSTEM_PROMPT, userPrompt)
    res.json({ draft: enhanced })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Resume enhancement failed' })
  }
})

// POST /api/resume/versions/approve { resumeId, candidateId, content, name, kind, targetJobTitle?, targetJobDescription? }
// Recruiter has reviewed an enhanced/generated draft and approves it — THIS is what actually persists a resume_version.
resumeRouter.post('/versions/approve', async (req: AuthedRequest, res) => {
  const { resumeId, candidateId, content, name, kind, targetJobTitle, targetJobDescription, template } = req.body as {
    resumeId: string; candidateId: string; content: unknown; name: string; kind: string
    targetJobTitle?: string; targetJobDescription?: string; template?: string
  }
  if (!resumeId || !candidateId || !content) {
    res.status(400).json({ error: 'resumeId, candidateId, and content are required' })
    return
  }

  const { count } = await supabaseAdmin
    .from('resume_versions')
    .select('*', { count: 'exact', head: true })
    .eq('resume_id', resumeId)

  const { data: version, error } = await supabaseAdmin
    .from('resume_versions')
    .insert({
      org_id: req.user!.org_id,
      resume_id: resumeId,
      candidate_id: candidateId,
      version_number: (count ?? 0) + 1,
      kind: kind || 'enhanced',
      status: 'approved',
      name: name || 'Untitled Version',
      target_job_title: targetJobTitle ?? null,
      target_job_description: targetJobDescription ?? null,
      template: template || 'classic',
      content,
      approved_by: req.user!.id,
      approved_at: new Date().toISOString(),
      created_by: req.user!.id,
    })
    .select()
    .single()
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  await supabaseAdmin.from('activities').insert({
    org_id: req.user!.org_id,
    entity_type: 'candidate',
    entity_id: candidateId,
    type: kind === 'generated' ? 'resume_generated' : 'resume_enhanced',
    summary: `Resume version "${version.name}" approved and saved`,
    actor_id: req.user!.id,
  })

  res.json({ version })
})

// POST /api/resume/generate { candidateId, targetJobTitle, targetJobDescription, template }
resumeRouter.post('/generate', async (req: AuthedRequest, res) => {
  if (!requireOpenAI(res)) return
  const { candidateId, targetJobTitle, targetJobDescription } = req.body as {
    candidateId?: string; targetJobTitle?: string; targetJobDescription?: string
  }
  if (!candidateId) {
    res.status(400).json({ error: 'candidateId is required' })
    return
  }

  const { data: resume, error } = await supabaseAdmin
    .from('resumes')
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('org_id', req.user!.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !resume) {
    res.status(404).json({ error: 'No parsed resume found for this candidate yet. Upload and parse a resume first.' })
    return
  }

  try {
    const userPrompt = `Candidate's actual resume data (the ONLY source of truth — do not add anything beyond this):\n${JSON.stringify(resume.parsed_data)}\n\nTailor the presentation and ordering for this target role, without inventing new experience:\nTarget title: ${targetJobTitle || '(none)'}\nTarget job description: ${targetJobDescription || '(none)'}`
    const draft = await jsonCompletion(ENHANCE_SYSTEM_PROMPT, userPrompt)
    res.json({ draft, resumeId: resume.id })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Resume generation failed' })
  }
})
