import type { Candidate, Job } from './domain'

export interface MatchResult {
  candidate: Candidate
  score: number
  matched: string[]
  missing: string[]
}

/** Deterministic, explainable skill/work-mode/availability matcher. Never
 * fabricates candidate qualifications — score is derived only from the
 * candidate's own recorded skills and job status. */
export function computeMatches(job: Job, candidates: Candidate[], limit = 10): MatchResult[] {
  const required = (job.required_skills ?? []).map((s) => s.toLowerCase())
  return candidates
    .map((c) => {
      const candSkills = [c.primary_skill, ...(c.secondary_skills ?? [])].filter(Boolean).map((s) => (s as string).toLowerCase())
      const matched = required.filter((r) => candSkills.some((cs) => cs.includes(r) || r.includes(cs)))
      const missing = required.filter((r) => !matched.includes(r))
      let score = required.length ? Math.round((matched.length / required.length) * 100) : 0
      if (job.work_mode !== 'any' && c.preferred_work_mode !== 'any' && c.preferred_work_mode !== job.work_mode) score -= 10
      if (c.status === 'placed' || c.status === 'inactive') score -= 30
      return { candidate: c, score: Math.max(0, score), matched, missing }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
