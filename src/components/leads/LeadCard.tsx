/**
 * LeadCard Component
 * Status-specific card for the lead pipeline with action buttons
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TransformedLead {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  property: string;
  suburb: string;
  state: string;
  postcode: string;
  status: string;
  source: string;
  dateCreated: string;
  lastContact?: string;
  estimatedValue?: number | null;
  issueDescription: string;
  leadNumber?: string | null;
  // For inspection_waiting status
  scheduled_dates?: string[];
  scheduled_time?: string;
  access_instructions?: string;
  assigned_technician?: string;
  // For not_landed status
  remove_reason?: string;
}

interface LeadCardProps {
  lead: TransformedLead;
  onViewLead: (id: string | number, status: string) => void;
  onSchedule: (id: string | number) => void;
  onStartInspection: (id: string | number) => void;
  onViewPDF: (id: string | number) => void;
  onApprove: (id: string | number) => void;
  onSendEmail: (id: string | number) => void;
  onArchive: (id: string | number) => void;
  onReactivate: (id: string | number) => void;
  onViewHistory: (id: string | number) => void;
}

// ============================================================================
// STATUS BADGE STYLES
// ============================================================================

const statusBadgeStyles: Record<string, string> = {
  new_lead: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inspection_waiting: 'bg-orange-50 text-orange-700 border-orange-100',
  approve_inspection_report: 'bg-slate-800 text-white border-slate-700',
  inspection_email_approval: 'bg-purple-50 text-purple-700 border-purple-100',
  closed: 'bg-blue-50 text-blue-700 border-blue-100',
  not_landed: 'bg-red-50 text-red-700 border-red-100',
};

const statusLabels: Record<string, string> = {
  new_lead: 'New Lead',
  inspection_waiting: 'Awaiting Inspection',
  approve_inspection_report: 'Approve Report',
  inspection_email_approval: 'Email Approval',
  closed: 'Closed',
  not_landed: 'Not Landed',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPhone(phone: string): string {
  // Format Australian phone for display
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('04') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LeadCard({
  lead,
  onViewLead,
  onSchedule,
  onStartInspection,
  onViewPDF,
  onApprove,
  onSendEmail,
  onArchive,
  onReactivate,
  onViewHistory,
}: LeadCardProps) {
  const badgeStyle = statusBadgeStyles[lead.status] || 'bg-slate-100 text-slate-600 border-slate-200';
  const statusLabel = statusLabels[lead.status] || lead.status;

  const handleArchive = () => {
    onArchive(lead.id);
  };

  const handleSendEmail = () => {
    onSendEmail(lead.id);
  };

  const handleViewHistory = () => {
    onViewHistory(lead.id);
  };

  // ============================================================================
  // RENDER STATUS-SPECIFIC INFO SECTION
  // ============================================================================

  const renderStatusInfo = () => {
    switch (lead.status) {
      case 'new_lead':
        return (
          <p className="text-sm text-slate-500 line-clamp-2">
            {lead.issueDescription || 'No issue description provided'}
          </p>
        );

      case 'inspection_waiting':
        return (
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-700">
              <span className="material-symbols-outlined text-lg">event</span>
              <span className="text-sm font-medium">
                {lead.scheduled_dates?.[0]
                  ? formatDate(lead.scheduled_dates[0])
                  : 'Date pending'}
                {lead.scheduled_time && ` at ${lead.scheduled_time}`}
              </span>
            </div>
            {lead.assigned_technician && (
              <div className="flex items-center gap-2 text-orange-600 mt-1">
                <span className="material-symbols-outlined text-lg">person</span>
                <span className="text-sm">{lead.assigned_technician}</span>
              </div>
            )}
          </div>
        );

      case 'approve_inspection_report':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              PDF Ready
            </span>
          </div>
        );

      case 'inspection_email_approval':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
              <span className="material-symbols-outlined text-sm">verified</span>
              Report Approved
            </span>
          </div>
        );

      case 'closed':
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <span className="material-symbols-outlined text-sm">task_alt</span>
              Completed
            </span>
            {lead.lastContact && (
              <span className="text-xs text-slate-500">
                {formatDate(lead.lastContact)}
              </span>
            )}
          </div>
        );

      case 'not_landed':
        return lead.remove_reason ? (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-red-700">
              <span className="font-medium">Reason: </span>
              {lead.remove_reason}
            </p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER STATUS-SPECIFIC ACTION BUTTONS
  // ============================================================================

  const renderStatusActions = () => {
    switch (lead.status) {
      case 'new_lead':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(lead.id);
            }}
            className="flex-1 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium
              hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Schedule
          </button>
        );

      case 'inspection_waiting':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartInspection(lead.id);
            }}
            className="flex-1 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium
              hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">play_arrow</span>
            Start Inspection
          </button>
        );

      case 'approve_inspection_report':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewPDF(lead.id);
              }}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              View PDF
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(lead.id);
              }}
              className="flex-1 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium
                hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">check</span>
              Approve
            </button>
          </>
        );

      case 'inspection_email_approval':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewPDF(lead.id);
              }}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              View PDF
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSendEmail();
              }}
              className="flex-1 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium
                hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">mail</span>
              Send Email
            </button>
          </>
        );

      case 'closed':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewPDF(lead.id);
              }}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">folder_open</span>
              Files & Photos
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewHistory();
              }}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">history</span>
              History
            </button>
          </>
        );

      case 'not_landed':
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(lead.id);
              }}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Reactivate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewHistory();
              }}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
                hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">history</span>
              History
            </button>
          </>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-apple hover:shadow-apple-hover
        transition-shadow cursor-pointer relative group"
      onClick={() => onViewLead(lead.id, lead.status)}
    >
      {/* Archive button (top right, visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleArchive();
        }}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 text-slate-400
          opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500
          transition-all flex items-center justify-center"
        title="Archive lead"
      >
        <span className="material-symbols-outlined text-lg">archive</span>
      </button>

      {/* Header: Avatar + Info */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-100 to-slate-200
          flex items-center justify-center text-slate-600 text-sm font-semibold shrink-0">
          {getInitials(lead.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {lead.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
            >
              {statusLabel}
            </span>
            {lead.leadNumber && (
              <span className="text-xs text-slate-400">{lead.leadNumber}</span>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
        <span className="material-symbols-outlined text-lg text-slate-400 shrink-0">location_on</span>
        <span className="line-clamp-1">
          {lead.property}, {lead.suburb} {lead.state} {lead.postcode}
        </span>
      </div>

      {/* Contact Buttons Row - Always visible */}
      <div className="flex gap-2 mb-3">
        {/* Phone Button */}
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/\s/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 h-9 px-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium
              hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">call</span>
            <span className="truncate">{formatPhone(lead.phone)}</span>
          </a>
        ) : (
          <div className="flex-1 h-9 px-3 rounded-lg bg-slate-50 text-slate-400 text-sm
            flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-base">call</span>
            <span>No phone</span>
          </div>
        )}

        {/* Email Button */}
        {lead.email ? (
          <a
            href={`mailto:${lead.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 h-9 px-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium
              hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 overflow-hidden"
          >
            <span className="material-symbols-outlined text-base shrink-0">mail</span>
            <span className="truncate">{lead.email}</span>
          </a>
        ) : (
          <div className="flex-1 h-9 px-3 rounded-lg bg-slate-50 text-slate-400 text-sm
            flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-base">mail</span>
            <span>No email</span>
          </div>
        )}
      </div>

      {/* Status-specific info section */}
      {renderStatusInfo() && (
        <div className="mb-3">
          {renderStatusInfo()}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex gap-2">
        {/* View Lead - Always shown */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewLead(lead.id, lead.status);
          }}
          className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium
            hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">visibility</span>
          View
        </button>

        {/* Status-specific action buttons */}
        {renderStatusActions()}
      </div>
    </div>
  );
}
