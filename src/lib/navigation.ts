import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Target, Users, Building2, KanbanSquare, UserSquare2, Briefcase,
  SendHorizonal, CalendarClock, Award, Bot, FileText, Sparkles, BarChart3,
  FolderKanban, ListTodo, Receipt, TrendingUp, Workflow, Building, UsersRound,
  Mail, Plug, CreditCard, ScrollText,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  implemented: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: 'CRM',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, implemented: true },
      { label: 'Leads', path: '/leads', icon: Target, implemented: true },
      { label: 'Contacts', path: '/contacts', icon: Users, implemented: true },
      { label: 'Companies', path: '/companies', icon: Building2, implemented: true },
      { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare, implemented: true },
      { label: 'Candidates', path: '/candidates', icon: UserSquare2, implemented: true },
      { label: 'Jobs / Requirements', path: '/jobs', icon: Briefcase, implemented: true },
      { label: 'Submissions', path: '/submissions', icon: SendHorizonal, implemented: true },
      { label: 'Interviews', path: '/interviews', icon: CalendarClock, implemented: false },
      { label: 'Placements', path: '/placements', icon: Award, implemented: false },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { label: 'AI Copilot', path: '/copilot', icon: Bot, implemented: false },
      { label: 'Resume AI', path: '/resume-ai', icon: FileText, implemented: false },
      { label: 'Candidate Matching', path: '/matching', icon: Sparkles, implemented: false },
      { label: 'Reports', path: '/reports', icon: BarChart3, implemented: false },
    ],
  },
  {
    title: 'WORK',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban, implemented: false },
      { label: 'Tasks', path: '/tasks', icon: ListTodo, implemented: true },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { label: 'Invoices', path: '/invoices', icon: Receipt, implemented: false },
      { label: 'Sales / Revenue', path: '/revenue', icon: TrendingUp, implemented: false },
    ],
  },
  {
    title: 'AUTOMATION',
    items: [{ label: 'Automation Builder', path: '/automation', icon: Workflow, implemented: false }],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'Organization', path: '/settings/organization', icon: Building, implemented: true },
      { label: 'Team', path: '/settings/team', icon: UsersRound, implemented: true },
      { label: 'Email', path: '/settings/email', icon: Mail, implemented: false },
      { label: 'Integrations', path: '/settings/integrations', icon: Plug, implemented: false },
      { label: 'Billing', path: '/settings/billing', icon: CreditCard, implemented: false },
      { label: 'Audit Logs', path: '/settings/audit-logs', icon: ScrollText, implemented: true },
    ],
  },
]
