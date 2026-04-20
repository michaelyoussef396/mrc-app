'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, Minus, Pencil, X, ClipboardCheck, AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { JobCompletionRow } from '@/types/jobCompletion';
import { formatDateAU } from '@/lib/dateUtils';

// 1-hour TTL for signed photo URLs — long enough to outlive the page session
const SIGNED_URL_TTL_SECONDS = 3600;

interface JobCompletionSummaryProps {
  jobCompletion: JobCompletionRow;
  leadId: string;
  isAdmin: boolean;
  /** When provided, a pencil edit button appears in each section header (admin only). */
  onEdit?: (sectionIndex: number) => void;
}

interface PhotoWithUrl {
  id: string;
  signed_url: string;
  photo_category: string;
}

interface PhotosByCategory {
  before: PhotoWithUrl[];
  after: PhotoWithUrl[];
  demolition: PhotoWithUrl[];
}

interface ProfileData {
  full_name: string | null;
}

// --- helpers ---

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[#86868b] text-xs">{children}</span>;
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-sm">{children}</p>;
}

function BoolRow({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {value ? (
        <Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
      ) : (
        <Minus className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function PhotoGrid({
  photos,
  isLoading,
  emptyMessage,
}: {
  photos: PhotoWithUrl[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gray-100 animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return <p className="text-sm text-[#86868b]">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="aspect-square rounded-lg overflow-hidden border border-gray-200"
        >
          <img
            src={photo.signed_url}
            alt="Remediation photo"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

// --- Equipment row helpers ---

interface EquipmentRowData {
  label: string;
  actualQty: number;
  actualDays: number;
  quotedQty: number | null; // null = no quoted data for this type
}

function EquipmentRow({ row }: { row: EquipmentRowData }) {
  const isOverQuoted =
    row.quotedQty !== null && row.actualQty > row.quotedQty;

  return (
    <div
      className={`rounded-lg border p-3 space-y-1 ${isOverQuoted ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}
    >
      <p className="text-sm font-medium">{row.label}</p>
      <div className="flex flex-col md:flex-row md:gap-6 gap-0.5">
        <span className="text-sm text-[#1d1d1f]">
          Actual:{' '}
          <strong>
            {row.actualQty} &times; {row.actualDays} days
          </strong>
        </span>
        <span className="text-sm text-[#86868b]">
          Quoted:{' '}
          {row.quotedQty !== null ? (
            <strong>{row.quotedQty} qty</strong>
          ) : (
            '—'
          )}
        </span>
      </div>
    </div>
  );
}

// --- main component ---

/**
 * JobCompletionSummary — Read-only display of all 10 job completion sections.
 *
 * Renders inside the LeadDetail page once a job_completion record exists.
 * Uses collapsible accordions so admins can inspect each section independently
 * without being overwhelmed by the full form at once.
 *
 * Photos are fetched lazily via useQuery and signed URLs are generated
 * server-side (1-hour TTL) to avoid storing publicly accessible links.
 *
 * Section 10 (Office Notes) is hidden from non-admin users.
 */
export function JobCompletionSummary({
  jobCompletion,
  leadId: _leadId,
  isAdmin,
  onEdit,
}: JobCompletionSummaryProps) {
  // Signed photo URLs for all three categories
  const { data: photosByCategory, isLoading: photosLoading } =
    useQuery<PhotosByCategory>({
      queryKey: ['job-completion-photos', jobCompletion.id],
      queryFn: async () => {
        const { data: rows, error } = await supabase
          .from('photos')
          .select('id, storage_path, photo_category')
          .eq('job_completion_id', jobCompletion.id)
          .in('photo_category', ['before', 'after', 'demolition'])
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!rows) return { before: [], after: [], demolition: [] };

        const withUrls = await Promise.all(
          rows.map(async (row) => {
            const { data } = await supabase.storage
              .from('inspection-photos')
              .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
            return {
              id: row.id,
              signed_url: data?.signedUrl ?? '',
              photo_category: row.photo_category as string,
            };
          })
        );

        const valid = withUrls.filter((p) => p.signed_url);
        return {
          before: valid.filter((p) => p.photo_category === 'before'),
          after: valid.filter((p) => p.photo_category === 'after'),
          demolition: valid.filter((p) => p.photo_category === 'demolition'),
        };
      },
    });

  // Profile lookup for the technician who completed the job
  const { data: completedByProfile } = useQuery<ProfileData | null>({
    queryKey: ['profile', jobCompletion.completed_by],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', jobCompletion.completed_by)
        .maybeSingle();
      return data;
    },
    enabled: !!jobCompletion.completed_by,
  });

  const completedByName =
    completedByProfile?.full_name ??
    jobCompletion.remediation_completed_by ??
    '—';

  const completionDateDisplay = formatDateAU(jobCompletion.completion_date) || '—';

  const treatmentMethods: Array<{
    field: keyof JobCompletionRow;
    label: string;
  }> = [
    { field: 'method_hepa_vacuuming', label: 'HEPA Vacuuming' },
    {
      field: 'method_surface_mould_remediation',
      label: 'Surface Mould Remediation',
    },
    { field: 'method_ulv_fogging_property', label: 'ULV Fogging Property' },
    { field: 'method_ulv_fogging_subfloor', label: 'ULV Fogging Subfloor' },
    { field: 'method_subfloor_remediation', label: 'Subfloor Remediation' },
    { field: 'method_afd_installation', label: 'AFD Installation' },
    { field: 'method_drying_equipment', label: 'Drying Equipment' },
    { field: 'method_containment_prv', label: 'Containment & PRV' },
    { field: 'method_material_demolition', label: 'Material Demolition' },
    { field: 'method_cavity_treatment', label: 'Cavity Treatment' },
    { field: 'method_debris_removal', label: 'Debris Removal' },
  ];

  const chemicals: Array<{ field: keyof JobCompletionRow; label: string }> = [
    { field: 'chemical_air_filtration', label: 'Air Filtration Device' },
    { field: 'chemical_water_based', label: 'Water Based Solution' },
    { field: 'chemical_sodium_hypochlorite', label: 'Sodium Hypochlorite' },
    { field: 'chemical_hepa_vacuumed', label: "HEPA Vac'd" },
    { field: 'chemical_sanitised_premises', label: 'Sanitised Premises' },
  ];

  const equipmentRows: EquipmentRowData[] = [
    {
      label: 'Dehumidifier',
      actualQty: jobCompletion.actual_dehumidifier_qty,
      actualDays: jobCompletion.actual_dehumidifier_days,
      quotedQty: jobCompletion.quoted_dehumidifier_qty,
    },
    {
      label: 'Air Mover',
      actualQty: jobCompletion.actual_air_mover_qty,
      actualDays: jobCompletion.actual_air_mover_days,
      quotedQty: jobCompletion.quoted_air_mover_qty,
    },
    {
      label: 'AFD',
      actualQty: jobCompletion.actual_afd_qty,
      actualDays: jobCompletion.actual_afd_days,
      quotedQty: null,
    },
    {
      label: 'RCD',
      actualQty: jobCompletion.actual_rcd_qty,
      actualDays: jobCompletion.actual_rcd_days,
      quotedQty: jobCompletion.quoted_rcd_qty,
    },
  ];

  const hasJobNotes =
    jobCompletion.request_review ||
    jobCompletion.damages_present ||
    jobCompletion.staining_present ||
    jobCompletion.additional_notes;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardCheck
          className="h-5 w-5 text-emerald-600 shrink-0"
          aria-hidden="true"
        />
        <h3 className="font-semibold text-[#1d1d1f]">Job Completion</h3>
        <Badge
          variant={
            jobCompletion.status === 'submitted' ? 'default' : 'secondary'
          }
        >
          {jobCompletion.status}
        </Badge>
      </div>

      {/* Warning banners — shown first so admins see them before opening sections */}
      {jobCompletion.scope_changed && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle
            className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-amber-800 text-sm font-medium">
            Scope variations recorded
          </p>
        </div>
      )}

      {jobCompletion.request_review && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle
            className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-yellow-800 text-sm font-medium">
            Admin review requested by technician
          </p>
        </div>
      )}

      {/* Accordion — all sections open simultaneously */}
      <Accordion type="multiple" className="w-full">
        {/* 1. Office Info */}
        <AccordionItem value="section-1">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 1 of 10 — Office Info</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 1"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(1); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Job Number</FieldLabel>
                <FieldValue>{jobCompletion.job_number || '—'}</FieldValue>
              </div>
              <div>
                <FieldLabel>Address Snapshot</FieldLabel>
                <FieldValue>
                  {jobCompletion.address_snapshot || '—'}
                </FieldValue>
              </div>
              <div>
                <FieldLabel>Requested By</FieldLabel>
                <FieldValue>{jobCompletion.requested_by || '—'}</FieldValue>
              </div>
              <div>
                <FieldLabel>Attention To</FieldLabel>
                <FieldValue>{jobCompletion.attention_to || '—'}</FieldValue>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Summary */}
        <AccordionItem value="section-2">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 2 of 10 — Summary</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 2"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(2); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <FieldLabel>SWMS</FieldLabel>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {jobCompletion.swms_completed ? (
                    <>
                      <Check
                        className="h-4 w-4 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-sm">Completed</span>
                    </>
                  ) : (
                    <>
                      <X
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-sm text-[#86868b]">
                        Not completed
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <FieldLabel>Premises Type</FieldLabel>
                <FieldValue className="capitalize">
                  {jobCompletion.premises_type
                    ? jobCompletion.premises_type.charAt(0).toUpperCase() +
                      jobCompletion.premises_type.slice(1)
                    : '—'}
                </FieldValue>
              </div>
              <div>
                <FieldLabel>Completed By</FieldLabel>
                <FieldValue>{completedByName}</FieldValue>
              </div>
              <div>
                <FieldLabel>Completion Date</FieldLabel>
                <FieldValue>{completionDateDisplay}</FieldValue>
              </div>
            </div>

            <div>
              <FieldLabel>Areas Treated</FieldLabel>
              {jobCompletion.areas_treated &&
              jobCompletion.areas_treated.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {jobCompletion.areas_treated.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#86868b] mt-1">
                  No areas recorded.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Before Photos */}
        <AccordionItem value="section-3">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 3 of 10 — Before Photos</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 3"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(3); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <PhotoGrid
              photos={photosByCategory?.before ?? []}
              isLoading={photosLoading}
              emptyMessage="No before photos selected."
            />
          </AccordionContent>
        </AccordionItem>

        {/* 4. After Photos */}
        <AccordionItem value="section-4">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 4 of 10 — After Photos</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 4"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(4); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Demolition badge */}
              <div>
                {jobCompletion.demolition_works ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-medium">
                    Demolition works: Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-1 text-xs font-medium">
                    Demolition works: No
                  </span>
                )}
              </div>

              <div>
                <SubHeading>After</SubHeading>
                <PhotoGrid
                  photos={photosByCategory?.after ?? []}
                  isLoading={photosLoading}
                  emptyMessage="No after photos uploaded."
                />
              </div>

              {jobCompletion.demolition_works && (
                <div>
                  <SubHeading>Demolition</SubHeading>
                  <PhotoGrid
                    photos={photosByCategory?.demolition ?? []}
                    isLoading={photosLoading}
                    emptyMessage="No demolition photos uploaded."
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Treatment Methods */}
        <AccordionItem value="section-5">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 5 of 10 — Treatment Methods</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 5"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(5); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              {treatmentMethods.map(({ field, label }) => (
                <BoolRow
                  key={field}
                  value={jobCompletion[field] as boolean}
                  label={label}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Chemicals Used */}
        <AccordionItem value="section-6">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 6 of 10 — Chemicals Used</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 6"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(6); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              {chemicals.map(({ field, label }) => (
                <BoolRow
                  key={field}
                  value={jobCompletion[field] as boolean}
                  label={label}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Equipment */}
        <AccordionItem value="section-7">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 7 of 10 — Equipment</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 7"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(7); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {equipmentRows.map((row) => (
                <EquipmentRow key={row.label} row={row} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 8. Variations */}
        <AccordionItem value="section-8">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 8 of 10 — Variations</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 8"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(8); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {!jobCompletion.scope_changed ? (
              <p className="text-sm text-[#86868b]">
                No scope variations recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {jobCompletion.scope_what_changed && (
                  <div>
                    <FieldLabel>What Changed</FieldLabel>
                    <p className="whitespace-pre-wrap text-sm mt-0.5">
                      {jobCompletion.scope_what_changed}
                    </p>
                  </div>
                )}
                {jobCompletion.scope_why_changed && (
                  <div>
                    <FieldLabel>Why Changed</FieldLabel>
                    <p className="whitespace-pre-wrap text-sm mt-0.5">
                      {jobCompletion.scope_why_changed}
                    </p>
                  </div>
                )}
                {jobCompletion.scope_extra_work && (
                  <div>
                    <FieldLabel>Extra Work Performed</FieldLabel>
                    <p className="whitespace-pre-wrap text-sm mt-0.5">
                      {jobCompletion.scope_extra_work}
                    </p>
                  </div>
                )}
                {jobCompletion.scope_reduced && (
                  <div>
                    <FieldLabel>Scope Reduced</FieldLabel>
                    <p className="whitespace-pre-wrap text-sm mt-0.5">
                      {jobCompletion.scope_reduced}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 9. Job Notes */}
        <AccordionItem value="section-9">
          <AccordionTrigger>
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span>Section 9 of 10 — Job Notes</span>
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit Section 9"
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(9); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                </button>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {!hasJobNotes ? (
              <p className="text-sm text-[#86868b]">No notes recorded.</p>
            ) : (
              <div className="space-y-4">
                {/* Status chips */}
                <div className="flex flex-wrap gap-2">
                  {jobCompletion.request_review && (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 text-xs font-medium">
                      Review Requested
                    </span>
                  )}
                  {jobCompletion.damages_present && (
                    <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 text-xs font-medium">
                      Damages Present
                    </span>
                  )}
                  {jobCompletion.staining_present && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-xs font-medium">
                      Staining Present
                    </span>
                  )}
                </div>

                {jobCompletion.damages_present &&
                  jobCompletion.damages_details && (
                    <div>
                      <FieldLabel>Damages Details</FieldLabel>
                      <p className="whitespace-pre-wrap text-sm mt-0.5">
                        {jobCompletion.damages_details}
                      </p>
                    </div>
                  )}

                {jobCompletion.staining_present &&
                  jobCompletion.staining_details && (
                    <div>
                      <FieldLabel>Staining Details</FieldLabel>
                      <p className="whitespace-pre-wrap text-sm mt-0.5">
                        {jobCompletion.staining_details}
                      </p>
                    </div>
                  )}

                {jobCompletion.additional_notes && (
                  <div>
                    <FieldLabel>Additional Notes</FieldLabel>
                    <p className="whitespace-pre-wrap text-sm mt-0.5">
                      {jobCompletion.additional_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 10. Office Notes — admin only */}
        {isAdmin && (
          <AccordionItem value="section-10">
            <AccordionTrigger>
              <span className="flex items-center gap-2 flex-1 min-w-0">
                <span>Section 10 of 10 — Office Notes</span>
                {onEdit && (
                  <button
                    type="button"
                    aria-label="Edit Section 10"
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 ml-1 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); onEdit(10); }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                  </button>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {jobCompletion.followup_required && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 text-xs font-medium">
                    Follow-up required
                  </span>
                )}

                {jobCompletion.office_notes ? (
                  <div>
                    <FieldLabel>Office Notes</FieldLabel>
                    <p className="whitespace-pre-wrap text-sm mt-0.5">
                      {jobCompletion.office_notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[#86868b]">No office notes.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
