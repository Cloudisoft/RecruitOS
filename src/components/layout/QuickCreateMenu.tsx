import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Target, Users, Building2, UserSquare2, Briefcase, SendHorizonal, ListTodo } from 'lucide-react'
import clsx from 'clsx'

const options = [
  { label: 'New Lead', path: '/leads?create=1', icon: Target },
  { label: 'New Contact', path: '/contacts?create=1', icon: Users },
  { label: 'New Company', path: '/companies?create=1', icon: Building2 },
  { label: 'New Candidate', path: '/candidates?create=1', icon: UserSquare2 },
  { label: 'New Job', path: '/jobs?create=1', icon: Briefcase },
  { label: 'New Submission', path: '/submissions?create=1', icon: SendHorizonal },
  { label: 'New Task', path: '/tasks?create=1', icon: ListTodo },
]

export function QuickCreateMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-400"
      >
        <Plus className="h-4 w-4" />
        Create
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-[#26272f] bg-[#16171d] py-1.5 shadow-xl">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.path}
                onClick={() => {
                  setOpen(false)
                  navigate(opt.path)
                }}
                className={clsx(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4 text-gray-500" />
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
