import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { api, ApiError } from '../../lib/apiClient'
import { Button } from '../../components/ui/Button'
import { Select, Textarea, Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/States'
import { downloadResumePdf } from '../../lib/resumePdf'
import { Sparkles, Wand2, FileText, Download, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

export function CandidateResumeAI({ candidateId }: { candidateId: string }) {
  const qc = useQueryClient()
  const [selectedDocId, setSelectedDocId] = useState('')
  const [parsing, setParsing] = useState(false)
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [targetJD, setTargetJD] = useState('')
  const [enhanceInstructions, setEnhanceInstructions] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [draft, setDraft] = useState<{ json: string; kind: 'enhanced' | 'generated'; targetJobTitle?: string; targetJobDescription?: string; resumeId: string } | null>(null)
  const [approving, setApproving] = useState(false)
  const [genTitle, setGenTitle] = useState('')
  const [genJD, setGenJD] = useState('')
  const [generating, setGenerating] = useState(false)

  const docsQ = useQuery({
    queryKey: ['candidate-documents', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.from('candidate_documents').select('*').eq('candidate_id', candidateId).in('category', ['original_resume', 'updated_resume']).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const resumesQ = useQuery({
    queryKey: ['candidate-resumes', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.from('resumes').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const versionsQ = useQuery({
    queryKey: ['candidate-resume-versions', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.from('resume_versions').select('*').eq('candidate_id', candidateId).order('version_number', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const selectedResume = resumesQ.data?.find((r: any) => r.id === selectedResumeId) ?? resumesQ.data?.[0]

  async function parseResume() {
    if (!selectedDocId) return
    setParsing(true)
    try {
      await api.post('/resume/parse', { candidateId, documentId: selectedDocId })
      toast.success('Resume parsed successfully')
      qc.invalidateQueries({ queryKey: ['candidate-resumes', candidateId] })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Parsing failed')
    } finally {
      setParsing(false)
    }
  }

  async function analyze() {
    if (!selectedResume) return
    setAnalyzing(true)
    try {
      await api.post('/resume/analyze', { resumeId: selectedResume.id, targetJobDescription: targetJD })
      toast.success('Analysis complete')
      qc.invalidateQueries({ queryKey: ['candidate-resumes', candidateId] })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function enhance() {
    if (!selectedResume) return
    setEnhancing(true)
    try {
      const res = await api.post<{ draft: any }>('/resume/enhance', { resumeId: selectedResume.id, instructions: enhanceInstructions })
      setDraft({ json: JSON.stringify(res.draft, null, 2), kind: 'enhanced', resumeId: selectedResume.id })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Enhancement failed')
    } finally {
      setEnhancing(false)
    }
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await api.post<{ draft: any; resumeId: string }>('/resume/generate', { candidateId, targetJobTitle: genTitle, targetJobDescription: genJD })
      setDraft({ json: JSON.stringify(res.draft, null, 2), kind: 'generated', targetJobTitle: genTitle, targetJobDescription: genJD, resumeId: res.resumeId })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function approveDraft() {
    if (!draft) return
    let content: unknown
    try {
      content = JSON.parse(draft.json)
    } catch {
      toast.error('Draft contains invalid JSON — fix formatting before approving')
      return
    }
    setApproving(true)
    try {
      await api.post('/resume/versions/approve', {
        resumeId: draft.resumeId,
        candidateId,
        content,
        kind: draft.kind,
        name: draft.kind === 'generated' ? (draft.targetJobTitle || 'Generated Resume') : 'Enhanced Resume',
        targetJobTitle: draft.targetJobTitle,
        targetJobDescription: draft.targetJobDescription,
      })
      toast.success('Resume version approved and saved')
      setDraft(null)
      qc.invalidateQueries({ queryKey: ['candidate-resume-versions', candidateId] })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to save version')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#22232b] bg-[#101116] p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><FileText className="h-4 w-4" /> 1. Parse a resume document</h4>
        {(docsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Upload an original or updated resume in the Documents tab first.</p>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} className="max-w-xs">
              <option value="">Select a document…</option>
              {docsQ.data!.map((d: any) => <option key={d.id} value={d.id}>{d.file_name}</option>)}
            </Select>
            <Button size="sm" onClick={parseResume} loading={parsing} disabled={!selectedDocId}><Sparkles className="h-4 w-4" /> Parse with AI</Button>
          </div>
        )}
      </section>

      {(resumesQ.data ?? []).length > 0 && (
        <section className="rounded-lg border border-[#22232b] bg-[#101116] p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-200">2. Review parsed data & analyze</h4>
          <Select value={selectedResume?.id ?? ''} onChange={(e) => setSelectedResumeId(e.target.value)} className="mb-3 max-w-xs">
            {resumesQ.data!.map((r: any) => <option key={r.id} value={r.id}>Parsed {new Date(r.created_at).toLocaleString()}</option>)}
          </Select>
          {selectedResume && (
            <div className="mb-4 space-y-2 text-sm">
              <p><span className="text-gray-500">Name:</span> {selectedResume.parsed_data?.full_name ?? '—'}</p>
              <p><span className="text-gray-500">Summary:</span> {selectedResume.parsed_data?.summary ?? '—'}</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedResume.parsed_data?.skills ?? []).map((s: string) => <Badge key={s} color="blue">{s}</Badge>)}
              </div>
            </div>
          )}
          <Textarea label="Target job description (optional, for gap analysis)" value={targetJD} onChange={(e) => setTargetJD(e.target.value)} />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={analyze} loading={analyzing}><Sparkles className="h-4 w-4" /> Analyze Resume</Button>
          </div>
          {selectedResume?.analysis && Object.keys(selectedResume.analysis).length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <AnalysisList label="Missing skills" items={selectedResume.analysis.missing_skills} />
              <AnalysisList label="ATS issues" items={selectedResume.analysis.ats_issues} />
              <AnalysisList label="Formatting issues" items={selectedResume.analysis.formatting_issues} />
              <AnalysisList label="Experience gaps" items={selectedResume.analysis.experience_gaps} />
              {typeof selectedResume.analysis.overall_score === 'number' && (
                <p className="col-span-2 text-gray-300">Overall score: <span className="font-semibold text-orange-400">{selectedResume.analysis.overall_score}/100</span></p>
              )}
            </div>
          )}
        </section>
      )}

      {selectedResume && (
        <section className="rounded-lg border border-[#22232b] bg-[#101116] p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200"><Wand2 className="h-4 w-4" /> 3. Enhance or Generate (requires your approval before saving)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Textarea label="Enhancement instructions" placeholder="e.g. Tighten the summary, emphasize AWS experience" value={enhanceInstructions} onChange={(e) => setEnhanceInstructions(e.target.value)} />
              <Button size="sm" className="mt-2" onClick={enhance} loading={enhancing}>Generate Enhanced Draft</Button>
            </div>
            <div>
              <Input label="Target job title" value={genTitle} onChange={(e) => setGenTitle(e.target.value)} />
              <Textarea label="Target job description" value={genJD} onChange={(e) => setGenJD(e.target.value)} />
              <Button size="sm" className="mt-2" onClick={generate} loading={generating}>Generate Tailored Draft</Button>
            </div>
          </div>

          {draft && (
            <div className="mt-4 rounded-lg border border-orange-600/30 bg-orange-500/5 p-3">
              <p className="mb-2 text-sm text-orange-300">Review the AI draft below. Edit anything before approving — nothing is saved until you approve.</p>
              <Textarea value={draft.json} onChange={(e) => setDraft({ ...draft, json: e.target.value })} className="min-h-[240px] font-mono text-xs" />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Discard</Button>
                <Button size="sm" onClick={approveDraft} loading={approving}>Approve & Save Version</Button>
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <h4 className="mb-3 text-sm font-semibold text-gray-200">Resume Versions</h4>
        {(versionsQ.data ?? []).length === 0 ? (
          <EmptyState title="No approved resume versions yet" description="Enhanced or generated drafts appear here once you approve them." />
        ) : (
          <div className="space-y-2">
            {versionsQ.data!.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3">
                <div>
                  <p className="text-sm text-gray-200">{v.name} <span className="text-gray-500">v{v.version_number}</span></p>
                  <div className="mt-1 flex gap-1.5">
                    <Badge color="purple">{v.kind}</Badge>
                    <Badge color="green">{v.status}</Badge>
                    <Badge color="gray">{v.template}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => downloadResumePdf(v.content, v.name)}><Download className="h-4 w-4" /> PDF</Button>
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(v.content, null, 2)).then(() => toast.success('Copied resume content as JSON'))}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AnalysisList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-1 text-gray-500">{label}</p>
      <ul className="list-inside list-disc space-y-0.5 text-gray-300">
        {items.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
  )
}
