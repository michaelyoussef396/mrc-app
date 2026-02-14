import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';

// Helper: invoke edge functions via direct fetch
async function invokeEdgeFunction(functionName: string, body: object): Promise<{ data: any; error: any }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || supabaseAnonKey;
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(body),
    });
    const responseData = await response.json();
    if (!response.ok) {
      return { data: null, error: { message: responseData.error || `HTTP ${response.status}` } };
    }
    return { data: responseData, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Network error' } };
  }
}

interface LeadData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  property_address_street: string;
  property_address_suburb: string;
  property_address_state: string;
  property_address_postcode: string;
  issue_description: string;
  internal_notes: string;
}

interface InspectionData {
  id: string;
  what_we_found_text: string | null;
  what_we_will_do_text: string | null;
  problem_analysis_content: string | null;
  demolition_content: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  dwelling_type: string | null;
  property_occupation: string | null;
  outdoor_temperature: number | null;
  outdoor_humidity: number | null;
  cause_of_mould: string | null;
}

interface AreaData {
  id: string;
  area_name: string;
  temperature: number | null;
  humidity: number | null;
  demolition_required: boolean;
}

export default function InspectionAIReview() {
  const navigate = useNavigate();
  const { leadId } = useParams<{ leadId: string }>();
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<LeadData | null>(null);
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [areas, setAreas] = useState<AreaData[]>([]);

  // Editable AI content
  const [whatWeFound, setWhatWeFound] = useState('');
  const [problemAnalysis, setProblemAnalysis] = useState('');
  const [whatWeWillDo, setWhatWeWillDo] = useState('');
  const [demolitionContent, setDemolitionContent] = useState('');

  // Regeneration state
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);

  // Track dirty state
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (leadId) loadData();
  }, [leadId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, issue_description, internal_notes')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      setLead(leadData);

      // Load inspection
      const { data: inspData, error: inspError } = await supabase
        .from('inspections')
        .select('id, what_we_found_text, what_we_will_do_text, problem_analysis_content, demolition_content, inspection_date, inspector_name, dwelling_type, property_occupation, outdoor_temperature, outdoor_humidity, cause_of_mould')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inspError) throw inspError;
      setInspection(inspData);
      setWhatWeFound(inspData.what_we_found_text || '');
      setProblemAnalysis(inspData.problem_analysis_content || '');
      setWhatWeWillDo(inspData.what_we_will_do_text || '');
      setDemolitionContent(inspData.demolition_content || '');

      // Load areas
      const { data: areasData } = await supabase
        .from('inspection_areas')
        .select('id, area_name, temperature, humidity, demolition_required')
        .eq('inspection_id', inspData.id)
        .order('area_order');

      setAreas(areasData || []);
    } catch (err: any) {
      console.error('[AIReview] Load error:', err);
      toast({ title: 'Error', description: 'Failed to load inspection data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!inspection) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          what_we_found_text: whatWeFound || null,
          what_we_will_do_text: whatWeWillDo || null,
          problem_analysis_content: problemAnalysis || null,
          demolition_content: demolitionContent || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspection.id);

      if (error) throw error;
      setIsDirty(false);
      toast({ title: 'Saved', description: 'AI content saved successfully' });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!leadId) return;
    // Save any pending changes first
    if (isDirty) await handleSave();

    try {
      await supabase.from('leads').update({ status: 'approve_inspection_report' }).eq('id', leadId);
      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'status_change',
        title: 'AI summary approved',
        description: 'Admin approved AI-generated content. Ready for PDF generation.',
      });
      toast({ title: 'Approved', description: 'AI content approved. Lead moved to report approval stage.' });
      navigate('/admin/leads');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!leadId) return;
    if (!window.confirm('Reject AI summary and send back to technician for re-inspection?')) return;

    try {
      await supabase.from('leads').update({ status: 'inspection_waiting' }).eq('id', leadId);
      await supabase.from('activities').insert({
        lead_id: leadId,
        activity_type: 'status_change',
        title: 'AI summary rejected',
        description: 'Admin rejected AI content. Lead sent back for re-inspection.',
      });
      toast({ title: 'Rejected', description: 'Lead sent back to awaiting inspection.' });
      navigate('/admin/leads');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to reject', variant: 'destructive' });
    }
  };

  const handleRegenerateAll = async () => {
    if (!inspection) return;
    setRegeneratingAll(true);
    try {
      // Build a minimal payload from what we have — the edge function mainly needs the inspection data
      const { data: fullInspection } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspection.id)
        .single();

      const { data: fullAreas } = await supabase
        .from('inspection_areas')
        .select('*, moisture_readings(*)')
        .eq('inspection_id', inspection.id)
        .order('area_order');

      const payload = buildEdgeFunctionPayload(fullInspection, fullAreas || [], lead);

      const { data, error } = await invokeEdgeFunction('generate-inspection-summary', {
        formData: payload,
        structured: true,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'AI generation failed');

      setWhatWeFound(data.what_we_found || '');
      setProblemAnalysis(data.detailed_analysis || '');
      setWhatWeWillDo(data.what_we_will_do || '');
      setDemolitionContent(data.demolition_details || '');
      setIsDirty(true);

      toast({ title: 'Regenerated', description: 'All AI sections regenerated. Remember to save.' });
    } catch (err: any) {
      console.error('[AIReview] Regenerate all error:', err);
      toast({ title: 'Generation Failed', description: err?.message || 'Failed to regenerate', variant: 'destructive' });
    } finally {
      setRegeneratingAll(false);
    }
  };

  type SectionKey = 'whatWeFound' | 'whatWeWillDo' | 'detailedAnalysis' | 'demolitionDetails';

  const handleRegenerateSection = async (section: SectionKey) => {
    if (!inspection) return;
    setRegeneratingSection(section);
    try {
      const contentMap: Record<SectionKey, string> = {
        whatWeFound: whatWeFound,
        whatWeWillDo: whatWeWillDo,
        detailedAnalysis: problemAnalysis,
        demolitionDetails: demolitionContent,
      };

      const { data: fullInspection } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspection.id)
        .single();

      const { data: fullAreas } = await supabase
        .from('inspection_areas')
        .select('*, moisture_readings(*)')
        .eq('inspection_id', inspection.id)
        .order('area_order');

      const payload = buildEdgeFunctionPayload(fullInspection, fullAreas || [], lead);

      const { data, error } = await invokeEdgeFunction('generate-inspection-summary', {
        formData: payload,
        section,
        currentContent: contentMap[section],
      });

      if (error) throw error;

      const newContent = data?.summary || contentMap[section];
      if (section === 'whatWeFound') setWhatWeFound(newContent);
      else if (section === 'whatWeWillDo') setWhatWeWillDo(newContent);
      else if (section === 'detailedAnalysis') setProblemAnalysis(newContent);
      else if (section === 'demolitionDetails') setDemolitionContent(newContent);

      setIsDirty(true);
      toast({ title: 'Section Regenerated', description: 'Content updated. Remember to save.' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message || 'Failed to regenerate section', variant: 'destructive' });
    } finally {
      setRegeneratingSection(null);
    }
  };

  const hasDemolition = areas.some(a => a.demolition_required);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Loading AI review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="ml-0 lg:ml-[260px] min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white flex-shrink-0 z-40 border-b border-slate-200">
          <div className="flex items-center px-6 py-4 justify-between">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined text-slate-900">menu</span>
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/leads')}
                className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600">arrow_back</span>
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="flex w-10 h-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <span className="material-symbols-outlined">rate_review</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">AI Summary Review</h1>
                  <p className="text-sm text-slate-500">
                    {lead?.full_name} — {lead?.property_address_street}, {lead?.property_address_suburb}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1" />

            {/* Action buttons in header */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handleReject}
                className="h-10 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Reject
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleApprove}
                className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                Approve & Next
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Column — Context Card */}
              <div className="lg:col-span-4 space-y-4">
                {/* Lead Info Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Lead Context</h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Property</p>
                      <p className="text-sm font-medium text-slate-900">
                        {lead?.property_address_street}
                      </p>
                      <p className="text-sm text-slate-500">
                        {lead?.property_address_suburb} {lead?.property_address_state} {lead?.property_address_postcode}
                      </p>
                    </div>

                    {lead?.issue_description && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Issue Description</p>
                        <p className="text-sm text-slate-700">{lead.issue_description}</p>
                      </div>
                    )}

                    {lead?.internal_notes && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Internal Notes</p>
                        <p className="text-sm text-slate-700">{lead.internal_notes}</p>
                      </div>
                    )}

                    {inspection?.cause_of_mould && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Cause of Mould</p>
                        <p className="text-sm text-slate-700">{inspection.cause_of_mould}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspection Metrics */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Inspection Metrics</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Areas</p>
                      <p className="text-lg font-bold text-slate-900">{areas.length}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Dwelling</p>
                      <p className="text-sm font-medium text-slate-900 capitalize">{inspection?.dwelling_type || '—'}</p>
                    </div>
                    {inspection?.outdoor_temperature && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Outdoor Temp</p>
                        <p className="text-lg font-bold text-slate-900">{inspection.outdoor_temperature}°C</p>
                      </div>
                    )}
                    {inspection?.outdoor_humidity && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400">Outdoor RH</p>
                        <p className="text-lg font-bold text-slate-900">{inspection.outdoor_humidity}%</p>
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Demolition</p>
                      <p className="text-sm font-medium text-slate-900">{hasDemolition ? 'Required' : 'None'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Inspector</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{inspection?.inspector_name || '—'}</p>
                    </div>
                  </div>

                  {/* Area list */}
                  {areas.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-400">Inspected Areas</p>
                      {areas.map(area => (
                        <div key={area.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                          <span className="font-medium text-slate-700">{area.area_name}</span>
                          <span className="text-slate-500 text-xs">
                            {area.temperature ? `${area.temperature}°C` : ''} {area.humidity ? `${area.humidity}%` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Regenerate All */}
                <button
                  onClick={handleRegenerateAll}
                  disabled={regeneratingAll}
                  className="w-full h-12 rounded-xl border-2 border-violet-300 text-violet-700 font-semibold flex items-center justify-center gap-2 hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  {regeneratingAll ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Regenerating All...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">auto_awesome</span>
                      Regenerate All Sections
                    </>
                  )}
                </button>
              </div>

              {/* Right Column — Editable AI Content */}
              <div className="lg:col-span-8 space-y-5">
                {/* Empty state */}
                {!whatWeFound && !problemAnalysis && !whatWeWillDo && !demolitionContent && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                    <span className="material-symbols-outlined text-amber-500 text-3xl mb-2">warning</span>
                    <h3 className="text-lg font-semibold text-amber-800 mb-1">AI Content Not Generated</h3>
                    <p className="text-sm text-amber-700 mb-4">
                      The AI summary was not generated during inspection completion. Use "Regenerate All Sections" to generate content now.
                    </p>
                  </div>
                )}

                {/* 1. What We Found */}
                <SectionCard
                  title="What We Found"
                  icon="search"
                  value={whatWeFound}
                  onChange={(v) => { setWhatWeFound(v); setIsDirty(true); }}
                  onRegenerate={() => handleRegenerateSection('whatWeFound')}
                  isRegenerating={regeneratingSection === 'whatWeFound'}
                  rows={4}
                />

                {/* 2. Problem Analysis & Recommendations */}
                <SectionCard
                  title="Problem Analysis & Recommendations"
                  icon="analytics"
                  value={problemAnalysis}
                  onChange={(v) => { setProblemAnalysis(v); setIsDirty(true); }}
                  onRegenerate={() => handleRegenerateSection('detailedAnalysis')}
                  isRegenerating={regeneratingSection === 'detailedAnalysis'}
                  rows={16}
                />

                {/* 3. What We're Going To Do */}
                <SectionCard
                  title="What We're Going To Do"
                  icon="handyman"
                  value={whatWeWillDo}
                  onChange={(v) => { setWhatWeWillDo(v); setIsDirty(true); }}
                  onRegenerate={() => handleRegenerateSection('whatWeWillDo')}
                  isRegenerating={regeneratingSection === 'whatWeWillDo'}
                  rows={8}
                />

                {/* 4. Demolition Details (conditional) */}
                {hasDemolition && (
                  <SectionCard
                    title="Demolition Details"
                    icon="construction"
                    value={demolitionContent}
                    onChange={(v) => { setDemolitionContent(v); setIsDirty(true); }}
                    onRegenerate={() => handleRegenerateSection('demolitionDetails')}
                    isRegenerating={regeneratingSection === 'demolitionDetails'}
                    rows={6}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Footer Actions */}
        <div className="sm:hidden sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-2">
          <button
            onClick={handleReject}
            className="h-12 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            Reject
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex-1 h-12 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 h-12 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-1 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">check</span>
            Approve
          </button>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// SECTION CARD COMPONENT
// ============================================================================

function SectionCard({
  title,
  icon,
  value,
  onChange,
  onRegenerate,
  isRegenerating,
  rows = 6,
}: {
  title: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  rows?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-600">{icon}</span>
          {title}
        </h3>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="h-8 px-3 rounded-lg text-violet-600 text-sm font-medium hover:bg-violet-50 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {isRegenerating ? (
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">refresh</span>
              Regenerate
            </>
          )}
        </button>
      </div>
      <div className="p-5">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm text-slate-900 rounded-lg border border-slate-200 px-4 py-3 resize-y focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          placeholder="AI-generated content will appear here..."
        />
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Build edge function payload from DB data
// ============================================================================

function buildEdgeFunctionPayload(inspection: any, areas: any[], lead: LeadData | null) {
  return {
    propertyAddress: lead?.property_address_street,
    clientName: lead?.full_name,
    issueDescription: lead?.issue_description || undefined,
    internalNotes: lead?.internal_notes || undefined,
    inspectionDate: inspection?.inspection_date,
    inspector: inspection?.inspector_name,
    triage: inspection?.triage_description,
    requestedBy: inspection?.requested_by,
    attentionTo: inspection?.attention_to,
    propertyOccupation: inspection?.property_occupation,
    dwellingType: inspection?.dwelling_type,
    areas: areas.map((a: any) => ({
      areaName: a.area_name,
      mouldDescription: a.mould_description,
      mouldVisibility: [],
      commentsForReport: a.comments_for_report,
      temperature: a.temperature,
      humidity: a.humidity,
      dewPoint: a.dew_point,
      timeWithoutDemo: a.time_without_demo,
      demolitionRequired: a.demolition_required,
      demolitionTime: a.demolition_time,
      demolitionDescription: a.demolition_description,
      moistureReadings: (a.moisture_readings || []).map((r: any) => ({
        title: r.location_title,
        reading: r.moisture_percentage?.toString(),
      })),
      externalMoisture: a.external_moisture,
      infraredEnabled: a.infrared_enabled,
      infraredObservations: [],
    })),
    subfloorObservations: inspection?.subfloor_observations,
    subfloorComments: inspection?.subfloor_comments,
    subfloorLandscape: inspection?.subfloor_landscape,
    subfloorSanitation: inspection?.subfloor_sanitation,
    subfloorRacking: inspection?.subfloor_racking,
    subfloorTreatmentTime: inspection?.subfloor_treatment_time,
    subfloorReadings: [],
    outdoorTemperature: inspection?.outdoor_temperature?.toString(),
    outdoorHumidity: inspection?.outdoor_humidity?.toString(),
    outdoorDewPoint: inspection?.outdoor_dew_point?.toString(),
    outdoorComments: inspection?.outdoor_comments,
    wasteDisposalEnabled: inspection?.waste_disposal_required,
    wasteDisposalAmount: inspection?.waste_disposal_amount,
    hepaVac: inspection?.hepa_vac,
    antimicrobial: inspection?.antimicrobial,
    stainRemovingAntimicrobial: inspection?.stain_removing_antimicrobial,
    homeSanitationFogging: inspection?.home_sanitation_fogging,
    commercialDehumidifierEnabled: inspection?.commercial_dehumidifier_enabled,
    commercialDehumidifierQty: inspection?.commercial_dehumidifier_qty,
    airMoversEnabled: inspection?.air_movers_enabled,
    airMoversQty: inspection?.air_movers_qty,
    rcdBoxEnabled: inspection?.rcd_box_enabled,
    rcdBoxQty: inspection?.rcd_box_qty,
    recommendDehumidifier: !!inspection?.recommended_dehumidifier,
    dehumidifierSize: inspection?.recommended_dehumidifier,
    causeOfMould: inspection?.cause_of_mould,
    additionalInfoForTech: inspection?.additional_info_technician,
    additionalEquipmentComments: inspection?.additional_equipment_comments,
    parkingOptions: inspection?.parking_option,
    laborCost: inspection?.labor_cost_ex_gst,
    equipmentCost: inspection?.equipment_cost_ex_gst,
    subtotalExGst: inspection?.subtotal_ex_gst,
    gstAmount: inspection?.gst_amount,
    totalIncGst: inspection?.total_inc_gst,
  };
}
