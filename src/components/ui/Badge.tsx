import clsx from 'clsx'

const palette: Record<string, string> = {
  gray: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
}

export function Badge({ color = 'gray', children }: { color?: keyof typeof palette; children: React.ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', palette[color])}>
      {children}
    </span>
  )
}

const leadStatusColor: Record<string, keyof typeof palette> = {
  new: 'blue', contacted: 'purple', qualified: 'orange', nurturing: 'yellow',
  sales_opportunity: 'green', converted: 'green', lost: 'red', closed: 'gray',
}
const candidateStatusColor: Record<string, keyof typeof palette> = {
  new: 'blue', screening: 'purple', ready_to_market: 'orange', marketing: 'orange',
  submitted: 'yellow', interviewing: 'purple', offer: 'green', background_check: 'yellow',
  placed: 'green', on_hold: 'gray', rejected: 'red', withdrawn: 'red', inactive: 'gray',
}
const submissionStatusColor: Record<string, keyof typeof palette> = {
  submitted: 'blue', resume_requested: 'purple', client_reviewing: 'yellow', shortlisted: 'orange',
  rejected: 'red', interview: 'purple', offer: 'green', withdrawn: 'red', placed: 'green',
}
const jobStatusColor: Record<string, keyof typeof palette> = {
  new: 'blue', open: 'green', sourcing: 'orange', submitting: 'orange',
  interviewing: 'purple', filled: 'green', closed: 'gray', cancelled: 'red',
}
const priorityColor: Record<string, keyof typeof palette> = {
  low: 'gray', medium: 'blue', high: 'orange', critical: 'red',
  lowest: 'gray',
}

function labelize(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status, kind }: { status: string; kind: 'lead' | 'candidate' | 'submission' | 'job' | 'priority' }) {
  const map = kind === 'lead' ? leadStatusColor
    : kind === 'candidate' ? candidateStatusColor
    : kind === 'submission' ? submissionStatusColor
    : kind === 'job' ? jobStatusColor
    : priorityColor
  return <Badge color={map[status] ?? 'gray'}>{labelize(status)}</Badge>
}
