import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format, addMonths, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { Interview } from '../../lib/domain'

export function InterviewCalendar({ interviews, onSelect }: { interviews: Interview[]; onSelect: (i: Interview) => void }) {
  const [month, setMonth] = useState(new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    return eachDayOfInterval({ start, end })
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, Interview[]>()
    for (const i of interviews) {
      const key = format(new Date(i.scheduled_at), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    }
    return map
  }, [interviews])

  return (
    <div className="rounded-xl border border-[#22232b] bg-[#14151a] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayInterviews = byDay.get(key) ?? []
          return (
            <div
              key={key}
              className={`min-h-[86px] rounded-lg border border-[#1c1d24] p-1.5 text-left ${
                isSameMonth(day, month) ? 'bg-[#101116]' : 'bg-transparent opacity-40'
              } ${isSameDay(day, new Date()) ? 'ring-1 ring-orange-500/50' : ''}`}
            >
              <p className="mb-1 text-[11px] text-gray-500">{format(day, 'd')}</p>
              <div className="space-y-1">
                {dayInterviews.slice(0, 3).map((i) => (
                  <button
                    key={i.id}
                    onClick={() => onSelect(i)}
                    className="block w-full truncate rounded bg-orange-500/10 px-1 py-0.5 text-left text-[10px] text-orange-300 hover:bg-orange-500/20"
                  >
                    {format(new Date(i.scheduled_at), 'h:mma')} · {i.interview_type}
                  </button>
                ))}
                {dayInterviews.length > 3 && <Badge color="gray">+{dayInterviews.length - 3} more</Badge>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
