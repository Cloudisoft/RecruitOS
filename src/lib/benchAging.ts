import { differenceInCalendarDays } from 'date-fns'

export function benchAgeDays(benchStartDate: string): number {
  return differenceInCalendarDays(new Date(), new Date(benchStartDate))
}

export function benchAgeBucket(days: number, thresholds: number[] = [15, 30, 60, 90]): { label: string; color: 'green' | 'blue' | 'yellow' | 'orange' | 'red' } {
  const [t1, t2, t3, t4] = thresholds
  if (days <= t1) return { label: `0-${t1} days`, color: 'green' }
  if (days <= t2) return { label: `${t1 + 1}-${t2} days`, color: 'blue' }
  if (days <= t3) return { label: `${t2 + 1}-${t3} days`, color: 'yellow' }
  if (days <= t4) return { label: `${t3 + 1}-${t4} days`, color: 'orange' }
  return { label: `${t4}+ days`, color: 'red' }
}
