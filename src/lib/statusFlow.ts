// Lead workflow status flow configuration
export type LeadStatus =
  | "new_lead"
  | "inspection_waiting"
  | "inspection_ai_summary"
  | "approve_inspection_report"
  | "inspection_email_approval"
  | "job_waiting"
  | "job_completed"
  | "pending_review"
  | "job_report_pdf_sent"
  | "invoicing_sent"
  | "paid"
  | "google_review"
  | "finished"
  | "closed"
  | "not_landed";

export interface StatusFlowConfig {
  next: LeadStatus | null;
  title: string;
  shortTitle: string;
  nextAction: string;
  iconName: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const STATUS_FLOW: Record<LeadStatus, StatusFlowConfig> = {
  'new_lead': {
    next: 'inspection_waiting',
    title: 'New Lead',
    shortTitle: 'NEW',
    nextAction: 'Book inspection with customer',
    iconName: 'Sparkles',
    color: 'hsl(217 91% 60%)',
    bgColor: 'hsl(217 91% 95%)',
    borderColor: 'hsl(217 91% 60%)',
  },
  'inspection_waiting': {
    next: 'inspection_ai_summary',
    title: 'Awaiting Inspection',
    shortTitle: 'AWAITING',
    nextAction: 'Complete inspection and submit form',
    iconName: 'Clock',
    color: 'hsl(38 92% 50%)',
    bgColor: 'hsl(38 92% 95%)',
    borderColor: 'hsl(38 92% 50%)',
  },
  'inspection_ai_summary': {
    next: 'approve_inspection_report',
    title: 'AI Summary Review',
    shortTitle: 'AI REVIEW',
    nextAction: 'Review and approve AI-generated content',
    iconName: 'Sparkles',
    color: 'hsl(263 70% 58%)',
    bgColor: 'hsl(263 70% 97%)',
    borderColor: 'hsl(263 70% 58%)',
  },
  'approve_inspection_report': {
    next: 'inspection_email_approval',
    title: 'Approve Inspection Report',
    shortTitle: 'APPROVE',
    nextAction: 'Review and approve PDF report',
    iconName: 'FileCheck2',
    color: 'hsl(280 70% 60%)',
    bgColor: 'hsl(280 70% 97%)',
    borderColor: 'hsl(280 70% 60%)',
  },
  'inspection_email_approval': {
    next: 'job_waiting',
    title: 'Email Approval',
    shortTitle: 'EMAIL',
    nextAction: 'Send inspection report via email',
    iconName: 'Mail',
    color: 'hsl(200 70% 60%)',
    bgColor: 'hsl(200 70% 97%)',
    borderColor: 'hsl(200 70% 60%)',
  },
  'job_waiting': {
    next: 'job_completed',
    title: 'Awaiting Job',
    shortTitle: 'JOB WAIT',
    nextAction: 'Complete remediation job on-site',
    iconName: 'Hammer',
    color: 'hsl(25 95% 53%)',
    bgColor: 'hsl(25 95% 97%)',
    borderColor: 'hsl(25 95% 53%)',
  },
  'job_completed': {
    next: 'job_report_pdf_sent',
    title: 'Job Completed',
    shortTitle: 'COMPLETED',
    nextAction: 'Review and approve job report',
    iconName: 'ClipboardCheck',
    color: 'hsl(160 60% 45%)',
    bgColor: 'hsl(160 60% 97%)',
    borderColor: 'hsl(160 60% 45%)',
  },
  'pending_review': {
    next: 'job_report_pdf_sent',
    title: 'Pending Review',
    shortTitle: 'REVIEW',
    nextAction: 'Admin review requested by technician',
    iconName: 'AlertTriangle',
    color: 'hsl(45 93% 47%)',
    bgColor: 'hsl(45 93% 97%)',
    borderColor: 'hsl(45 93% 47%)',
  },
  'job_report_pdf_sent': {
    next: 'invoicing_sent',
    title: 'Job Report Sent',
    shortTitle: 'REPORT SENT',
    nextAction: 'Generate and send invoice',
    iconName: 'FileText',
    color: 'hsl(210 70% 55%)',
    bgColor: 'hsl(210 70% 97%)',
    borderColor: 'hsl(210 70% 55%)',
  },
  'invoicing_sent': {
    next: 'paid',
    title: 'Invoice Sent',
    shortTitle: 'INVOICED',
    nextAction: 'Awaiting customer payment',
    iconName: 'Receipt',
    color: 'hsl(280 60% 55%)',
    bgColor: 'hsl(280 60% 97%)',
    borderColor: 'hsl(280 60% 55%)',
  },
  'paid': {
    next: 'google_review',
    title: 'Paid',
    shortTitle: 'PAID',
    nextAction: 'Send Google review request',
    iconName: 'DollarSign',
    color: 'hsl(142 76% 36%)',
    bgColor: 'hsl(142 76% 95%)',
    borderColor: 'hsl(142 76% 36%)',
  },
  'google_review': {
    next: 'finished',
    title: 'Google Review',
    shortTitle: 'REVIEW',
    nextAction: 'Awaiting Google review or close lead',
    iconName: 'Star',
    color: 'hsl(48 96% 53%)',
    bgColor: 'hsl(48 96% 97%)',
    borderColor: 'hsl(48 96% 53%)',
  },
  'finished': {
    next: null,
    title: 'Finished',
    shortTitle: 'FINISHED',
    nextAction: 'Lead fully completed',
    iconName: 'CheckCircle2',
    color: 'hsl(142 76% 30%)',
    bgColor: 'hsl(142 76% 95%)',
    borderColor: 'hsl(142 76% 30%)',
  },
  'closed': {
    next: null,
    title: 'Closed',
    shortTitle: 'CLOSED',
    nextAction: 'Lead completed successfully',
    iconName: 'CheckCircle2',
    color: 'hsl(142 76% 36%)',
    bgColor: 'hsl(142 76% 95%)',
    borderColor: 'hsl(142 76% 36%)',
  },
  'not_landed': {
    next: null,
    title: 'Not Landed',
    shortTitle: 'NOT LANDED',
    nextAction: 'Lead lost or rejected',
    iconName: 'XCircle',
    color: 'hsl(0 84% 60%)',
    bgColor: 'hsl(0 84% 97%)',
    borderColor: 'hsl(0 84% 60%)',
  },
};

// Ordered array of all statuses for pipeline display
export const ALL_STATUSES: LeadStatus[] = [
  'new_lead',
  'inspection_waiting',
  'inspection_ai_summary',
  'approve_inspection_report',
  'inspection_email_approval',
  'job_waiting',
  'job_completed',
  'pending_review',
  'job_report_pdf_sent',
  'invoicing_sent',
  'paid',
  'google_review',
  'finished',
  'closed',
  'not_landed',
];

// Helper to check if status is a terminal state
export const isTerminalStatus = (status: LeadStatus): boolean => {
  return status === 'closed' || status === 'not_landed' || status === 'finished';
};

// Helper to get next status in flow
export const getNextStatus = (currentStatus: LeadStatus): LeadStatus | null => {
  return STATUS_FLOW[currentStatus]?.next || null;
};
