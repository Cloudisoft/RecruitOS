import { createEntityHooks } from './crud'
import type {
  Lead, Contact, Company, Opportunity, Candidate, Job, Submission, Task,
  MarketingCampaign, MarketingActivity, Note, Activity,
  Interview, Offer, BackgroundCheck, Placement, Project, Invoice, RevenueRecord,
  Automation, AutomationAction, EmailTemplate,
} from './domain'

export const leadHooks = createEntityHooks<Lead>('leads', 'leads')
export const contactHooks = createEntityHooks<Contact>('contacts', 'contacts')
export const companyHooks = createEntityHooks<Company>('companies', 'companies')
export const opportunityHooks = createEntityHooks<Opportunity>('opportunities', 'opportunities')
export const candidateHooks = createEntityHooks<Candidate>('candidates', 'candidates')
export const jobHooks = createEntityHooks<Job>('jobs', 'jobs')
export const submissionHooks = createEntityHooks<Submission>('submissions', 'submissions')
export const taskHooks = createEntityHooks<Task>('tasks', 'tasks')
export const campaignHooks = createEntityHooks<MarketingCampaign>('marketing_campaigns', 'marketing_campaigns')
export const marketingActivityHooks = createEntityHooks<MarketingActivity>('marketing_activities', 'marketing_activities')
export const noteHooks = createEntityHooks<Note>('notes', 'notes')
export const activityHooks = createEntityHooks<Activity>('activities', 'activities')
export const interviewHooks = createEntityHooks<Interview>('interviews', 'interviews')
export const offerHooks = createEntityHooks<Offer>('offers', 'offers')
export const backgroundCheckHooks = createEntityHooks<BackgroundCheck>('background_checks', 'background_checks')
export const placementHooks = createEntityHooks<Placement>('placements', 'placements')
export const projectHooks = createEntityHooks<Project>('projects', 'projects')
export const invoiceHooks = createEntityHooks<Invoice>('invoices', 'invoices')
export const revenueHooks = createEntityHooks<RevenueRecord>('revenue_records', 'revenue_records')
export const automationHooks = createEntityHooks<Automation>('automations', 'automations')
export const automationActionHooks = createEntityHooks<AutomationAction>('automation_actions', 'automation_actions')
export const emailTemplateHooks = createEntityHooks<EmailTemplate>('email_templates', 'email_templates')
