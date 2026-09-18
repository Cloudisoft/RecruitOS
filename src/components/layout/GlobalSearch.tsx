import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

interface Result {
  type: string
  id: string
  title: string
  subtitle: string
  path: string
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const debounced = useDebouncedValue(query, 300)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const term = `%${debounced}%`

    Promise.all([
      supabase.from('leads').select('id,first_name,last_name,company,email').or(`first_name.ilike.${term},last_name.ilike.${term},company.ilike.${term},email.ilike.${term}`).limit(5),
      supabase.from('contacts').select('id,first_name,last_name,email').or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`).limit(5),
      supabase.from('companies').select('id,name,website').or(`name.ilike.${term},website.ilike.${term}`).limit(5),
      supabase.from('candidates').select('id,first_name,last_name,primary_skill,email').or(`first_name.ilike.${term},last_name.ilike.${term},primary_skill.ilike.${term},email.ilike.${term}`).limit(5),
      supabase.from('jobs').select('id,title,location').or(`title.ilike.${term},location.ilike.${term}`).limit(5),
    ]).then(([leads, contacts, companies, candidates, jobs]) => {
      if (cancelled) return
      const out: Result[] = []
      for (const l of leads.data ?? []) out.push({ type: 'Lead', id: l.id, title: `${l.first_name} ${l.last_name}`, subtitle: l.company ?? l.email ?? '', path: `/leads/${l.id}` })
      for (const c of contacts.data ?? []) out.push({ type: 'Contact', id: c.id, title: `${c.first_name} ${c.last_name}`, subtitle: c.email ?? '', path: `/contacts/${c.id}` })
      for (const c of companies.data ?? []) out.push({ type: 'Company', id: c.id, title: c.name, subtitle: c.website ?? '', path: `/companies/${c.id}` })
      for (const c of candidates.data ?? []) out.push({ type: 'Candidate', id: c.id, title: `${c.first_name} ${c.last_name}`, subtitle: c.primary_skill ?? c.email ?? '', path: `/candidates/${c.id}` })
      for (const j of jobs.data ?? []) out.push({ type: 'Job', id: j.id, title: j.title, subtitle: j.location ?? '', path: `/jobs/${j.id}` })
      setResults(out)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [debounced])

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#ffffff] px-3">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search candidates, jobs, companies…"
          className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
      </div>
      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-y-auto rounded-lg border border-[#e5e7eb] bg-[#ffffff] py-1.5 shadow-xl">
          {results.length === 0 && !loading && (
            <p className="px-3 py-3 text-sm text-gray-500">No results for "{debounced}"</p>
          )}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => {
                setOpen(false)
                setQuery('')
                navigate(r.path)
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/5"
            >
              <span className="truncate text-gray-800">{r.title}</span>
              <span className="ml-2 shrink-0 text-xs text-gray-500">{r.type} · {r.subtitle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
