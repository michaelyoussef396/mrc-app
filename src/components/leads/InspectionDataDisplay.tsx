import { useState } from 'react';
import type {
  CompleteInspectionData,
  AreaWithDetails,
  SubfloorWithDetails,
  PhotoWithUrl,
  MoistureReadingData,
} from '@/lib/api/inspections';

// ============================================================================
// FORMATTERS
// ============================================================================

const fmtDate = (v: string | null) => {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtNum = (v: number | null | undefined, unit = '') => (v != null ? `${v}${unit}` : '—');
const fmtBool = (v: boolean | null | undefined) => (v ? 'Yes' : 'No');
const fmtMins = (v: number | null | undefined) => {
  if (!v) return '—';
  const h = Math.floor(v / 60);
  const m = v % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtCurrency = (v: number | null | undefined) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v);
};

// ============================================================================
// PROPS
// ============================================================================

interface InspectionDataDisplayProps {
  data: CompleteInspectionData;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InspectionDataDisplay({ data }: InspectionDataDisplayProps) {
  const { inspection: insp, areas, subfloor, photos } = data;

  // Photos that aren't tied to an area or subfloor (outdoor / direction / front-door etc)
  const generalPhotos = photos.filter(p => !p.area_id && !p.subfloor_id);

  return (
    <div className="space-y-3">
      <AccordionSection title="Basic Information" icon="info" defaultOpen>
        <BasicInfoSection inspection={insp} />
      </AccordionSection>

      <AccordionSection title="Property Details" icon="home">
        <PropertyDetailsSection inspection={insp} />
      </AccordionSection>

      {areas.map((area, i) => (
        <AccordionSection
          key={area.id}
          title={`Area ${i + 1}: ${area.area_name || 'Unnamed'}`}
          icon="room"
          badge={area.demolition_required ? 'Demo Required' : undefined}
        >
          <AreaSection area={area} />
        </AccordionSection>
      ))}

      {(insp.subfloor_required || subfloor) && (
        <AccordionSection title="Subfloor Assessment" icon="foundation">
          <SubfloorSection subfloor={subfloor} />
        </AccordionSection>
      )}

      <AccordionSection title="Outdoor Environment" icon="wb_sunny">
        <OutdoorSection inspection={insp} photos={generalPhotos} />
      </AccordionSection>

      <AccordionSection title="Waste Disposal" icon="delete">
        <WasteDisposalSection inspection={insp} />
      </AccordionSection>

      <AccordionSection title="Work Procedure & Equipment" icon="construction">
        <WorkProcedureSection inspection={insp} />
      </AccordionSection>

      <AccordionSection title="Job Summary" icon="assignment">
        <JobSummarySection inspection={insp} />
      </AccordionSection>

      <AccordionSection title="Cost Estimate" icon="payments">
        <CostEstimateSection inspection={insp} />
      </AccordionSection>

      {(insp.what_we_found_text || insp.problem_analysis_content || insp.what_we_will_do_text || insp.demolition_content) && (
        <AccordionSection title="AI Summary" icon="auto_awesome" defaultOpen>
          <AISummarySection inspection={insp} />
        </AccordionSection>
      )}
    </div>
  );
}

// ============================================================================
// ACCORDION SECTION
// ============================================================================

function AccordionSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-slate-500 text-xl">{icon}</span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              {badge}
            </span>
          )}
        </div>
        <span
          className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ============================================================================
// KEY-VALUE ROW
// ============================================================================

function KV({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between py-1.5 ${className || ''}`}>
      <span className="text-xs text-slate-500 shrink-0 mr-3">{label}</span>
      <span className="text-sm text-slate-900 font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

// ============================================================================
// SECTION 1: BASIC INFO
// ============================================================================

function BasicInfoSection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-1 divide-y divide-slate-100">
      <KV label="Job Number" value={i.job_number} />
      <KV label="Inspection Date" value={fmtDate(i.inspection_date)} />
      <KV label="Inspector" value={i.inspector_name} />
      <KV label="Triage" value={i.triage_description} />
      <KV label="Requested By" value={i.requested_by} />
      <KV label="Attention To" value={i.attention_to} />
    </div>
  );
}

// ============================================================================
// SECTION 2: PROPERTY DETAILS
// ============================================================================

function PropertyDetailsSection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-1 divide-y divide-slate-100">
      <KV label="Dwelling Type" value={<span className="capitalize">{i.dwelling_type || '—'}</span>} />
      <KV label="Occupation" value={<span className="capitalize">{(i.property_occupation || '').replace(/_/g, ' ') || '—'}</span>} />
    </div>
  );
}

// ============================================================================
// SECTION 3: AREA
// ============================================================================

function AreaSection({ area }: { area: AreaWithDetails }) {
  return (
    <div className="space-y-4">
      {/* Environment */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Temp" value={fmtNum(area.temperature, '°C')} />
        <MetricCard label="Humidity" value={fmtNum(area.humidity, '%')} />
        <MetricCard label="Dew Point" value={fmtNum(area.dew_point, '°C')} />
        <MetricCard label="Ext. Moisture" value={fmtNum(area.external_moisture, '%')} />
      </div>

      {/* Visible Mould */}
      {(area.mould_visible_locations?.length || area.mould_visible_custom || area.mould_description) && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Visible Mould</p>
          {area.mould_visible_locations?.length ? (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex flex-wrap gap-1.5 mb-1">
                {area.mould_visible_locations.map((loc) => (
                  <span key={loc} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {loc}
                  </span>
                ))}
              </div>
              {area.mould_visible_custom && (
                <p className="text-sm text-slate-600 italic mt-2">{area.mould_visible_custom}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
              {area.mould_description}
            </p>
          )}
        </div>
      )}

      {/* Comments for Report */}
      {area.comments && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Comments for Report</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {area.comments}
          </p>
        </div>
      )}

      {/* Infrared */}
      {area.infrared_enabled && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Infrared Observations</p>
          <div className="flex flex-wrap gap-1.5">
            {area.infrared_observation_no_active && <Tag>No Active Water</Tag>}
            {area.infrared_observation_water_infiltration && <Tag color="red">Water Infiltration</Tag>}
            {area.infrared_observation_past_ingress && <Tag color="amber">Past Water Ingress</Tag>}
            {area.infrared_observation_condensation && <Tag color="blue">Condensation</Tag>}
            {area.infrared_observation_missing_insulation && <Tag color="orange">Missing Insulation</Tag>}
          </div>
        </div>
      )}

      {/* Demolition */}
      {area.demolition_required && (
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <p className="text-xs font-semibold text-red-700 mb-1">Demolition Required</p>
          <KV label="Time" value={fmtMins(area.demolition_time_minutes)} />
          {area.demolition_description && (
            <p className="text-sm text-red-800 mt-1 whitespace-pre-line">{area.demolition_description}</p>
          )}
        </div>
      )}

      {/* Job Time */}
      {area.job_time_minutes != null && area.job_time_minutes > 0 && (
        <KV label="Job Time (no demo)" value={fmtMins(area.job_time_minutes)} />
      )}

      {/* Moisture Readings */}
      {area.moisture_readings.length > 0 && (
        <MoistureReadingsTable readings={area.moisture_readings} />
      )}

      {/* Photos */}
      {area.photos.length > 0 && (
        <PhotoGrid photos={area.photos} label="Area Photos" />
      )}
    </div>
  );
}

// ============================================================================
// SECTION 4: SUBFLOOR
// ============================================================================

function SubfloorSection({ subfloor }: { subfloor: SubfloorWithDetails | null }) {
  if (!subfloor) {
    return <p className="text-sm text-slate-400 italic">No subfloor data recorded.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 divide-y divide-slate-100">
        <KV label="Landscape" value={<span className="capitalize">{subfloor.landscape || '—'}</span>} />
        <KV label="Sanitation Required" value={fmtBool(subfloor.sanitation_required)} />
        <KV label="Racking Required" value={fmtBool(subfloor.racking_required)} />
        <KV label="Treatment Time" value={fmtMins(subfloor.treatment_time_minutes)} />
      </div>

      {subfloor.observations && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Observations</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {subfloor.observations}
          </p>
        </div>
      )}

      {subfloor.comments && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Comments</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {subfloor.comments}
          </p>
        </div>
      )}

      {/* Readings */}
      {subfloor.readings.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Moisture Readings</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Location</th>
                  <th className="pb-2">Moisture %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subfloor.readings.map((r, i) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-slate-700">{r.location || '—'}</td>
                    <td className="py-2">
                      <MoistureValue value={r.moisture_percentage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photos */}
      {subfloor.photos.length > 0 && (
        <PhotoGrid photos={subfloor.photos} label="Subfloor Photos" />
      )}
    </div>
  );
}

// ============================================================================
// SECTION 5: OUTDOOR
// ============================================================================

function OutdoorSection({ inspection: i, photos }: { inspection: Record<string, any>; photos: PhotoWithUrl[] }) {
  const outdoorPhotos = photos.filter(p =>
    ['outdoor', 'frontDoor', 'frontHouse', 'mailbox', 'street', 'direction'].includes(p.photo_type)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Temp" value={fmtNum(i.outdoor_temperature, '°C')} />
        <MetricCard label="Humidity" value={fmtNum(i.outdoor_humidity, '%')} />
        <MetricCard label="Dew Point" value={fmtNum(i.outdoor_dew_point, '°C')} />
      </div>

      {i.outdoor_comments && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Comments</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {i.outdoor_comments}
          </p>
        </div>
      )}

      {outdoorPhotos.length > 0 && (
        <PhotoGrid photos={outdoorPhotos} label="Outdoor Photos" />
      )}
    </div>
  );
}

// ============================================================================
// SECTION 6: WASTE DISPOSAL
// ============================================================================

function WasteDisposalSection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-1 divide-y divide-slate-100">
      <KV label="Required" value={fmtBool(i.waste_disposal_required)} />
      {i.waste_disposal_required && (
        <KV label="Amount" value={<span className="capitalize">{i.waste_disposal_amount || '—'}</span>} />
      )}
    </div>
  );
}

// ============================================================================
// SECTION 7: WORK PROCEDURE & EQUIPMENT
// ============================================================================

function WorkProcedureSection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-4">
      {/* Procedure items */}
      <div className="space-y-1 divide-y divide-slate-100">
        <KV label="HEPA Vacuum" value={fmtBool(i.hepa_vac)} />
        <KV label="Antimicrobial" value={fmtBool(i.antimicrobial)} />
        <KV label="Stain Removing Antimicrobial" value={fmtBool(i.stain_removing_antimicrobial)} />
        <KV label="Home Sanitation Fogging" value={fmtBool(i.home_sanitation_fogging)} />
      </div>

      {/* Equipment */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Equipment</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {i.commercial_dehumidifier_enabled && (
            <MetricCard label="Dehumidifiers" value={`${i.commercial_dehumidifier_qty || 0}`} />
          )}
          {i.air_movers_enabled && (
            <MetricCard label="Air Movers" value={`${i.air_movers_qty || 0}`} />
          )}
          {i.rcd_box_enabled && (
            <MetricCard label="RCD Boxes" value={`${i.rcd_box_qty || 0}`} />
          )}
        </div>
      </div>

      {i.recommended_dehumidifier && (
        <KV label="Recommended Dehumidifier" value={<span className="capitalize">{i.recommended_dehumidifier}</span>} />
      )}
    </div>
  );
}

// ============================================================================
// SECTION 8: JOB SUMMARY
// ============================================================================

function JobSummarySection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-4">
      {i.cause_of_mould && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Cause of Mould</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {i.cause_of_mould}
          </p>
        </div>
      )}

      {i.additional_info_technician && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Additional Info (Technician)</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {i.additional_info_technician}
          </p>
        </div>
      )}

      {i.additional_equipment_comments && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Equipment Comments</p>
          <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
            {i.additional_equipment_comments}
          </p>
        </div>
      )}

      <div className="space-y-1 divide-y divide-slate-100">
        <KV label="Parking" value={<span className="capitalize">{(i.parking_option || '').replace(/_/g, ' ') || '—'}</span>} />
      </div>
    </div>
  );
}

// ============================================================================
// SECTION 9: COST ESTIMATE
// ============================================================================

function CostEstimateSection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-4">
      {/* Hours breakdown */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Labour Hours</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="No Demo" value={`${i.no_demolition_hours || 0}h`} />
          <MetricCard label="Demolition" value={`${i.demolition_hours || 0}h`} />
          <MetricCard label="Subfloor" value={`${i.subfloor_hours || 0}h`} />
          <MetricCard
            label="Total"
            value={`${(Number(i.no_demolition_hours || 0) + Number(i.demolition_hours || 0) + Number(i.subfloor_hours || 0))}h`}
          />
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-1 divide-y divide-slate-100">
        <KV label="Labour (ex GST)" value={fmtCurrency(i.labor_cost_ex_gst)} />
        <KV label="Equipment (ex GST)" value={fmtCurrency(i.equipment_cost_ex_gst)} />
        {Number(i.discount_percent) > 0 && (
          <KV label="Discount" value={`${i.discount_percent}%`} />
        )}
        <KV label="Subtotal (ex GST)" value={fmtCurrency(i.subtotal_ex_gst)} />
        <KV label="GST (10%)" value={fmtCurrency(i.gst_amount)} />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-bold text-slate-800">Total (inc GST)</span>
          <span className="text-base font-bold text-emerald-700">{fmtCurrency(i.total_inc_gst)}</span>
        </div>
      </div>

      {i.manual_price_override && (
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-xs font-medium text-amber-700">
            Manual price override applied — {fmtCurrency(i.manual_total_inc_gst)}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI SUMMARY
// ============================================================================

function AISummarySection({ inspection: i }: { inspection: Record<string, any> }) {
  return (
    <div className="space-y-4">
      {i.what_we_found_text && (
        <AICard title="What We Found" icon="search" content={i.what_we_found_text} />
      )}
      {i.problem_analysis_content && (
        <AICard title="Problem Analysis & Recommendations" icon="analytics" content={i.problem_analysis_content} />
      )}
      {i.what_we_will_do_text && (
        <AICard title="What We're Going To Do" icon="handyman" content={i.what_we_will_do_text} />
      )}
      {i.demolition_content && (
        <AICard title="Demolition Details" icon="construction" content={i.demolition_content} />
      )}
    </div>
  );
}

function AICard({ title, icon, content }: { title: string; icon: string; content: string }) {
  return (
    <div className="bg-violet-50 rounded-lg border border-violet-100 overflow-hidden">
      <div className="px-4 py-2 bg-violet-100/50 flex items-center gap-2">
        <span className="material-symbols-outlined text-violet-600 text-base">{icon}</span>
        <span className="text-sm font-semibold text-violet-800">{title}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-violet-900 whitespace-pre-line leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Tag({ children, color = 'green' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.green}`}>
      {children}
    </span>
  );
}

function MoistureValue({ value }: { value: number }) {
  let color = 'text-green-700 bg-green-50';
  if (value >= 20) color = 'text-red-700 bg-red-50';
  else if (value >= 15) color = 'text-amber-700 bg-amber-50';

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${color}`}>
      {value}%
    </span>
  );
}

function MoistureReadingsTable({ readings }: { readings: MoistureReadingData[] }) {
  const [lightbox, setLightbox] = useState<{ photos: PhotoWithUrl[]; index: number } | null>(null);

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">Moisture Readings</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b">
              <th className="pb-2 pr-4">#</th>
              <th className="pb-2 pr-4">Location</th>
              <th className="pb-2 pr-4">Moisture %</th>
              <th className="pb-2">Photo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {readings.map((r, i) => (
              <tr key={r.id}>
                <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                <td className="py-2 pr-4 font-medium text-slate-700">{r.title || '—'}</td>
                <td className="py-2 pr-4">
                  <MoistureValue value={r.moisture_percentage} />
                </td>
                <td className="py-2">
                  {r.photos.length > 0 ? (
                    <img
                      src={r.photos[0].signed_url}
                      alt={r.title}
                      className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightbox({ photos: r.photos, index: 0 })}
                    />
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// PHOTO GRID
// ============================================================================

function PhotoGrid({ photos, label }: { photos: PhotoWithUrl[]; label: string }) {
  const [lightbox, setLightbox] = useState<{ photos: PhotoWithUrl[]; index: number } | null>(null);

  if (photos.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{label} ({photos.length})</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-slate-100"
            onClick={() => setLightbox({ photos, index: i })}
          >
            {photo.signed_url ? (
              <img
                src={photo.signed_url}
                alt={photo.caption || photo.photo_type}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-300">broken_image</span>
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
              <p className="text-[10px] text-white truncate capitalize">
                {photo.photo_type?.replace(/([A-Z])/g, ' $1').trim() || 'Photo'}
              </p>
            </div>
          </div>
        ))}
      </div>
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// PHOTO LIGHTBOX
// ============================================================================

function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: PhotoWithUrl[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const goPrev = () => setIndex(i => (i > 0 ? i - 1 : photos.length - 1));
  const goNext = () => setIndex(i => (i < photos.length - 1 ? i + 1 : 0));

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <span className="material-symbols-outlined text-2xl">chevron_right</span>
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[80vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {photo?.signed_url ? (
          <img
            src={photo.signed_url}
            alt={photo.caption || photo.photo_type}
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />
        ) : (
          <div className="w-64 h-64 bg-slate-800 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-500 text-4xl">broken_image</span>
          </div>
        )}

        {/* Photo info */}
        <div className="mt-3 text-center">
          <p className="text-white text-sm font-medium capitalize">
            {photo?.photo_type?.replace(/([A-Z])/g, ' $1').trim() || 'Photo'}
          </p>
          {photo?.caption && (
            <p className="text-white/70 text-xs mt-1">{photo.caption}</p>
          )}
          <p className="text-white/50 text-xs mt-1">
            {index + 1} of {photos.length}
            {photo?.created_at && ` — ${new Date(photo.created_at).toLocaleDateString('en-AU')}`}
          </p>
        </div>
      </div>
    </div>
  );
}
