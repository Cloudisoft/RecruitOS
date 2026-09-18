export type AppRole = 'user' | 'admin' | 'global_admin'

export interface Organization {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  timezone: string
  currency: string
  date_format: string
  status: 'active' | 'suspended' | 'trial' | 'cancelled'
  bench_aging_thresholds: number[]
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AppUser {
  id: string
  org_id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  title: string | null
  role: AppRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type LeadStatus =
  | 'new' | 'contacted' | 'qualified' | 'nurturing' | 'sales_opportunity' | 'converted' | 'lost' | 'closed'
export type LeadSource =
  | 'linkedin' | 'referral' | 'website' | 'email' | 'cold_call' | 'job_board' | 'existing_client' | 'vendor' | 'other'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Lead {
  id: string
  org_id: string
  first_name: string
  last_name: string
  company: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  website: string | null
  location: string | null
  source: LeadSource
  lead_type: string | null
  industry: string | null
  technology: string | null
  notes: string | null
  owner_id: string | null
  status: LeadStatus
  priority: Priority
  last_contacted_at: string | null
  next_follow_up_at: string | null
  converted_contact_id: string | null
  converted_company_id: string | null
  converted_opportunity_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ContactType =
  | 'client' | 'hiring_manager' | 'recruiter' | 'vendor' | 'msp'
  | 'implementation_partner' | 'candidate_contact' | 'reference' | 'other'

export interface Contact {
  id: string
  org_id: string
  first_name: string
  last_name: string
  title: string | null
  company_id: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  location: string | null
  contact_type: ContactType
  relationship: string | null
  owner_id: string | null
  notes: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CompanyType = 'client' | 'vendor' | 'msp' | 'staffing_company' | 'direct_employer' | 'partner'
export type CompanyStatus = 'active' | 'inactive' | 'prospect' | 'blacklisted'

export interface Company {
  id: string
  org_id: string
  name: string
  website: string | null
  industry: string | null
  location: string | null
  company_size: string | null
  company_type: CompanyType
  account_owner_id: string | null
  status: CompanyStatus
  priority: Priority
  description: string | null
  notes: string | null
  billing_info: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export type OpportunityStage =
  | 'new_opportunity' | 'contacted' | 'qualified' | 'requirement_received' | 'proposal_discussion'
  | 'active_hiring' | 'submission_activity' | 'interview' | 'negotiation' | 'closed_won' | 'closed_lost'

export interface Opportunity {
  id: string
  org_id: string
  name: string
  company_id: string | null
  contact_id: string | null
  estimated_value: number
  probability: number
  owner_id: string | null
  stage: OpportunityStage
  expected_close_date: string | null
  source: LeadSource | null
  notes: string | null
  lead_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CandidateStatus =
  | 'new' | 'screening' | 'ready_to_market' | 'marketing' | 'submitted' | 'interviewing'
  | 'offer' | 'background_check' | 'placed' | 'on_hold' | 'rejected' | 'withdrawn' | 'inactive'
export type BenchStatus = 'active_bench' | 'marketing' | 'interviewing' | 'placed' | 'not_available' | 'on_hold'
export type WorkAuthorization =
  | 'us_citizen' | 'green_card' | 'h1b' | 'h4_ead' | 'opt' | 'cpt' | 'tn' | 'l2' | 'other'
export type WorkMode = 'remote' | 'hybrid' | 'onsite' | 'any'

export interface Candidate {
  id: string
  org_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  alternate_phone: string | null
  location: string | null
  current_city: string | null
  state: string | null
  country: string | null
  work_authorization: WorkAuthorization | null
  visa_type: string | null
  visa_expiration: string | null
  availability: string | null
  willing_to_relocate: boolean
  willing_to_travel: boolean
  current_title: string | null
  target_title: string | null
  primary_skill: string | null
  secondary_skills: string[]
  total_experience_years: number | null
  relevant_experience_years: number | null
  education: string | null
  certifications: string[]
  industry_experience: string[]
  preferred_location: string | null
  preferred_work_mode: WorkMode
  expected_rate: number | null
  minimum_rate: number | null
  availability_date: string | null
  bench_status: BenchStatus
  bench_start_date: string
  recruiter_owner_id: string | null
  sales_owner_id: string | null
  marketing_owner_id: string | null
  priority: Priority
  marketability: string | null
  last_marketed_at: string | null
  marketing_frequency: string | null
  status: CandidateStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type JobStatus = 'new' | 'open' | 'sourcing' | 'submitting' | 'interviewing' | 'filled' | 'closed' | 'cancelled'
export type EmploymentType = 'w2' | 'c2c' | '1099' | 'fulltime' | 'contract_to_hire'

export interface Job {
  id: string
  org_id: string
  title: string
  company_id: string | null
  hiring_manager_contact_id: string | null
  recruiter_id: string | null
  description: string | null
  required_skills: string[]
  preferred_skills: string[]
  experience_required: string | null
  location: string | null
  work_mode: WorkMode
  rate_min: number | null
  rate_max: number | null
  employment_type: EmploymentType
  contract_duration: string | null
  visa_requirements: string | null
  priority: Priority
  openings: number
  status: JobStatus
  date_received: string
  closing_date: string | null
  jd_document_path: string | null
  opportunity_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CampaignStatus = 'draft' | 'ready' | 'running' | 'paused' | 'completed'

export interface MarketingCampaign {
  id: string
  org_id: string
  name: string
  candidate_id: string
  target_market: string | null
  target_roles: string[]
  skills: string[]
  target_location: string | null
  contact_list: string[]
  resume_version_id: string | null
  email_template_id: string | null
  status: CampaignStatus
  start_date: string | null
  owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type MarketingChannel =
  | 'resume_blast' | 'email' | 'linkedin' | 'vendor' | 'client' | 'recruiter_outreach' | 'job_matching' | 'follow_up'
export type ResponseType =
  | 'interested' | 'requirement_received' | 'asked_for_resume' | 'interview' | 'not_interested' | 'no_response' | 'follow_up_required'

export interface MarketingActivity {
  id: string
  org_id: string
  campaign_id: string | null
  candidate_id: string
  company_id: string | null
  contact_id: string | null
  activity_date: string
  channel: MarketingChannel
  resume_sent: boolean
  resume_version_id: string | null
  job_sent: string | null
  response: ResponseType | null
  notes: string | null
  recruiter_id: string | null
  next_follow_up_at: string | null
  created_by: string | null
  created_at: string
}

export type SubmissionStatus =
  | 'submitted' | 'resume_requested' | 'client_reviewing' | 'shortlisted' | 'rejected'
  | 'interview' | 'offer' | 'withdrawn' | 'placed'

export interface Submission {
  id: string
  org_id: string
  candidate_id: string
  job_id: string
  company_id: string | null
  contact_id: string | null
  resume_version_id: string | null
  submitted_by: string | null
  submission_date: string
  bill_rate: number | null
  pay_rate: number | null
  expected_rate: number | null
  status: SubmissionStatus
  notes: string | null
  follow_up_at: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'backlog' | 'to_do' | 'in_progress' | 'blocked' | 'review' | 'done'
export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  org_id: string
  title: string
  description: string | null
  assignee_id: string | null
  reporter_id: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  start_date: string | null
  labels: string[]
  related_entity_type: string | null
  related_entity_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  org_id: string
  entity_type: string
  entity_id: string
  type: string
  summary: string
  previous_value: unknown
  new_value: unknown
  actor_id: string | null
  created_at: string
}

export interface Note {
  id: string
  org_id: string
  entity_type: string
  entity_id: string
  body: string
  author_id: string | null
  created_at: string
  updated_at: string
}
