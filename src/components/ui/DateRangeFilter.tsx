import { useState } from 'react'
import { Select, Input } from './Input'
import { startOfDay, startOfWeek, startOfMonth, subDays, endOfDay } from 'date-fns'

export type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'last_30' | 'last_90' | 'custom'

export interface DateRange {
  start: Date | null
  end: Date | null
}

export function computeRange(preset: DateRangePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date()
  switch (preset) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) }
    case 'this_week': return { start: startOfWeek(now), end: endOfDay(now) }
    case 'this_month': return { start: startOfMonth(now), end: endOfDay(now) }
    case 'last_30': return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) }
    case 'last_90': return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) }
    case 'custom': return { start: customStart ? new Date(customStart) : null, end: customEnd ? new Date(customEnd) : null }
  }
}

export function DateRangeFilter({ value, onChange }: { value: { preset: DateRangePreset; customStart?: string; customEnd?: string }; onChange: (v: { preset: DateRangePreset; customStart?: string; customEnd?: string }) => void }) {
  const [customStart, setCustomStart] = useState(value.customStart ?? '')
  const [customEnd, setCustomEnd] = useState(value.customEnd ?? '')

  return (
    <div className="flex items-center gap-2">
      <Select value={value.preset} onChange={(e) => onChange({ ...value, preset: e.target.value as DateRangePreset })} className="max-w-[160px]">
        <option value="today">Today</option>
        <option value="this_week">This Week</option>
        <option value="this_month">This Month</option>
        <option value="last_30">Last 30 Days</option>
        <option value="last_90">Last 90 Days</option>
        <option value="custom">Custom</option>
      </Select>
      {value.preset === 'custom' && (
        <>
          <Input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); onChange({ ...value, customStart: e.target.value, customEnd }) }} className="max-w-[160px]" />
          <span className="text-gray-500">to</span>
          <Input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); onChange({ ...value, customStart, customEnd: e.target.value }) }} className="max-w-[160px]" />
        </>
      )}
    </div>
  )
}
