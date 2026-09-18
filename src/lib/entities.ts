import { createEntityHooks } from './crud'
import type {
  Lead, Contact, Company, Opportunity, Candidate, Job, Submission, Task,
  MarketingCampaign, MarketingActivity, Note, Activity,
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
