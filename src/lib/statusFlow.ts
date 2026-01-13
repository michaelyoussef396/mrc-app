// Lead workflow status flow configuration - Stage 1 Only
export type LeadStatus =
  | "new_lead"
  | "inspection_waiting"
  | "approve_inspection_report"
  | "inspection_email_approval"
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
    next: 'approve_inspection_report',
    title: 'Awaiting Inspection',
    shortTitle: 'AWAITING',
    nextAction: 'Complete inspection and submit form',
    iconName: 'Clock',
    color: 'hsl(38 92% 50%)',
    bgColor: 'hsl(38 92% 95%)',
    borderColor: 'hsl(38 92% 50%)',
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
    next: 'closed',
    title: 'Email Approval',
    shortTitle: 'EMAIL',
    nextAction: 'Send inspection report via email',
    iconName: 'Mail',
    color: 'hsl(200 70% 60%)',
    bgColor: 'hsl(200 70% 97%)',
    borderColor: 'hsl(200 70% 60%)',
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
  'approve_inspection_report',
  'inspection_email_approval',
  'closed',
  'not_landed',
];

// Helper to check if status is a terminal state
export const isTerminalStatus = (status: LeadStatus): boolean => {
  return status === 'closed' || status === 'not_landed';
};

// Helper to get next status in flow
export const getNextStatus = (currentStatus: LeadStatus): LeadStatus | null => {
  return STATUS_FLOW[currentStatus]?.next || null;
};
