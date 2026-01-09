// Lead workflow status flow configuration
export type LeadStatus =
  | "new_lead"
  | "contacted"
  | "inspection_waiting"
  | "approve_inspection_report"   // PDF review and approval stage
  | "inspection_email_approval"   // Email sending approval stage
  | "inspection_completed"
  | "inspection_report_pdf_completed"
  | "job_waiting"
  | "job_completed"
  | "job_report_pdf_sent"
  | "invoicing_sent"
  | "paid"
  | "google_review"
  | "finished";

export interface StatusFlowConfig {
  next: LeadStatus | null;
  title: string;
  shortTitle: string;
  nextAction: string;
  iconName: string; // Icon name from lucide-react
  color: string;
  bgColor: string;
  borderColor: string;
}

export const STATUS_FLOW: Record<LeadStatus, StatusFlowConfig> = {
  'new_lead': {
    next: 'contacted',
    title: 'New Lead',
    shortTitle: 'NEW',
    nextAction: 'Call customer and book inspection',
    iconName: 'Sparkles',
    color: 'hsl(217 91% 60%)',
    bgColor: 'hsl(217 91% 95%)',
    borderColor: 'hsl(217 91% 60%)',
  },
  'contacted': {
    next: 'inspection_waiting',
    title: 'Contacted',
    shortTitle: 'CONTACTED',
    nextAction: 'Show up to scheduled inspection',
    iconName: 'CheckCircle',
    color: 'hsl(142 76% 36%)',
    bgColor: 'hsl(142 76% 95%)',
    borderColor: 'hsl(142 76% 36%)',
  },
  'inspection_waiting': {
    next: 'approve_inspection_report',  // Goes to PDF review/approval stage
    title: 'Inspection Waiting',
    shortTitle: 'INSP WAIT',
    nextAction: 'Conduct inspection and submit form',
    iconName: 'Clock',
    color: 'hsl(38 92% 50%)',
    bgColor: 'hsl(38 92% 95%)',
    borderColor: 'hsl(38 92% 50%)',
  },
  'approve_inspection_report': {
    next: 'inspection_email_approval',
    title: 'Approve Inspection Report',
    shortTitle: 'APPROVE REPORT',
    nextAction: 'Review and approve PDF report',
    iconName: 'FileCheck2',
    color: 'hsl(280 70% 60%)',
    bgColor: 'hsl(280 70% 97%)',
    borderColor: 'hsl(280 70% 60%)',
  },
  'inspection_completed': {
    next: 'inspection_email_approval',
    title: 'Inspection Completed',
    shortTitle: 'INSP DONE',
    nextAction: 'Review and approve inspection data',
    iconName: 'FileText',
    color: 'hsl(239 84% 67%)',
    bgColor: 'hsl(239 84% 97%)',
    borderColor: 'hsl(239 84% 67%)',
  },
  'inspection_email_approval': {
    next: 'inspection_report_pdf_completed',
    title: 'Inspection Email Approval',
    shortTitle: 'EMAIL APPROVAL',
    nextAction: 'Send inspection report via email',
    iconName: 'Mail',
    color: 'hsl(200 70% 60%)',
    bgColor: 'hsl(200 70% 97%)',
    borderColor: 'hsl(200 70% 60%)',
  },
  'inspection_report_pdf_completed': {
    next: 'job_waiting',
    title: 'Report PDF Sent',
    shortTitle: 'PDF SENT',
    nextAction: 'PDF report approved and sent to client',
    iconName: 'Send',
    color: 'hsl(271 81% 56%)',
    bgColor: 'hsl(271 81% 97%)',
    borderColor: 'hsl(271 81% 56%)',
  },
  'job_waiting': {
    next: 'job_completed',
    title: 'Job Waiting',
    shortTitle: 'JOB WAIT',
    nextAction: 'Wait for customer to book job',
    iconName: 'Calendar',
    color: 'hsl(25 95% 53%)',
    bgColor: 'hsl(25 95% 95%)',
    borderColor: 'hsl(25 95% 53%)',
  },
  'job_completed': {
    next: 'job_report_pdf_sent',
    title: 'Job Completed',
    shortTitle: 'JOB DONE',
    nextAction: 'Complete remediation work',
    iconName: 'Wrench',
    color: 'hsl(142 76% 36%)',
    bgColor: 'hsl(142 76% 95%)',
    borderColor: 'hsl(142 76% 36%)',
  },
  'job_report_pdf_sent': {
    next: 'invoicing_sent',
    title: 'Job Report Sent',
    shortTitle: 'REPORT SENT',
    nextAction: 'Send completion report to customer',
    iconName: 'Send',
    color: 'hsl(217 91% 60%)',
    bgColor: 'hsl(217 91% 95%)',
    borderColor: 'hsl(217 91% 60%)',
  },
  'invoicing_sent': {
    next: 'paid',
    title: 'Invoice Sent',
    shortTitle: 'INVOICE',
    nextAction: 'Send invoice to customer',
    iconName: 'DollarSign',
    color: 'hsl(48 96% 53%)',
    bgColor: 'hsl(48 96% 95%)',
    borderColor: 'hsl(48 96% 53%)',
  },
  'paid': {
    next: 'google_review',
    title: 'Paid',
    shortTitle: 'PAID',
    nextAction: 'Mark payment as received',
    iconName: 'CheckCircle2',
    color: 'hsl(142 76% 36%)',
    bgColor: 'hsl(142 76% 95%)',
    borderColor: 'hsl(142 76% 36%)',
  },
  'google_review': {
    next: 'finished',
    title: 'Google Review',
    shortTitle: 'REVIEW',
    nextAction: 'Request Google review',
    iconName: 'Star',
    color: 'hsl(38 92% 50%)',
    bgColor: 'hsl(38 92% 95%)',
    borderColor: 'hsl(38 92% 50%)',
  },
  'finished': {
    next: null,
    title: 'Finished',
    shortTitle: 'FINISHED',
    nextAction: 'Job complete - archived',
    iconName: 'PartyPopper',
    color: 'hsl(142 71% 45%)',
    bgColor: 'hsl(142 71% 95%)',
    borderColor: 'hsl(142 71% 45%)',
  },
};

export const ALL_STATUSES: LeadStatus[] = [
  'new_lead',
  'contacted',
  'inspection_waiting',
  'approve_inspection_report',   // PDF review/approval stage
  'inspection_email_approval',   // Email sending approval stage
  'inspection_completed',
  'inspection_report_pdf_completed',
  'job_waiting',
  'job_completed',
  'job_report_pdf_sent',
  'invoicing_sent',
  'paid',
  'google_review',
  'finished',
];
