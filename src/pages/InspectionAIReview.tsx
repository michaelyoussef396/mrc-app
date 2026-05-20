import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { captureBusinessError } from '@/lib/sentry';
import { logFieldEdits } from '@/lib/api/fieldEditLog';
import AdminSidebar from '@/components/admin/AdminSidebar';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  HardHat,
  Loader2,
  Menu,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  status: string;
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

type SectionKey = 'whatWeFound' | 'whatWeWillDo' | 'detailedAnalysis' | 'demolitionDetails';

const SECTION_LABELS: Record<SectionKey, string> = {
  whatWeFound: 'What We Found',
  detailedAnalysis: 'Problem Analysis & Recommendations',
  whatWeWillDo: "What We're Going To Do",
  demolitionDetails: 'Demolition Details',
};

// Maps the in-form section key to the ai_summary_versions content column it represents.
// Used as the FieldChange.field for activity logs so the existing timeline label
// resolver (title-cased snake_case) produces a readable label.
const SECTION_TO_DB_FIELD: Record<SectionKey, string> = {
  whatWeFound: 'what_we_found_text',
  detailedAnalysis: 'problem_analysis_content',
  whatWeWillDo: 'what_we_will_do_text',
  demolitionDetails: 'demolition_content',
};

// Verbatim copy of TechnicianInspectionForm reconstruct helper (source of truth at
// src/pages/TechnicianInspectionForm.tsx:2751-2759). The two surfaces must stay in
// lockstep so AI Review regens and tech-form regens produce identical prompts.
function reconstructInfraredObservations(area: {
  infrared_observation_no_active?: boolean | null;
  infrared_observation_water_infiltration?: boolean | null;
  infrared_observation_past_ingress?: boolean | null;
  infrared_observation_condensation?: boolean | null;
  infrared_observation_missing_insulation?: boolean | null;
}): string[] {
  const obs: string[] = [];
  if (area.infrared_observation_no_active) obs.push('No Active Water Intrusion Detected');
  if (area.infrared_observation_water_infiltration) obs.push('Active Water Infiltration');
  if (area.infrared_observation_past_ingress) obs.push('Past Water Ingress (Dried)');
  if (area.infrared_observation_condensation) obs.push('Condensation Pattern');
  if (area.infrared_observation_missing_insulation) obs.push('Missing/Inadequate Insulation');
  return obs;
}

export default function InspectionAIReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  // Global feedback applies to Regenerate All Sections only.
  const [feedbackText, setFeedbackText] = useState('');
  // Per-section feedback applies to that section's Regenerate button only.
  const [sectionFeedback, setSectionFeedback] = useState<Record<SectionKey, string>>({
    whatWeFound: '',
    detailedAnalysis: '',
    whatWeWillDo: '',
    demolitionDetails: '',
  });

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
        .select('id, status, full_name, email, phone, property_address_street, property_address_suburb, property_address_state, property_address_postcode, issue_description, internal_notes')
        .eq('id', leadId)
        .is('archived_at', null)
        .single();

      if (leadError) throw leadError;
      setLead(leadData);

      // Load inspection metadata (AI text fields are read separately from
      // latest_ai_summary view per Stage 3.4.5).
      const { data: inspData, error: inspError } = await supabase
        .from('inspections')
        .select('id, inspection_date, inspector_name, dwelling_type, property_occupation, outdoor_temperature, outdoor_humidity, cause_of_mould')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inspError) throw inspError;
      setInspection(inspData);

      // Load AI summary content from the latest_ai_summary compatibility view
      // (canonical source post Stage 3.2). Empty result is valid when no AI
      // generation has happened yet — fields stay blank for the admin to regen.
      const { data: latestSummary } = await supabase
        .from('latest_ai_summary')
        .select('what_we_found_text, what_we_will_do_text, problem_analysis_content, demolition_content')
        .eq('inspection_id', inspData.id)
        .maybeSingle();

      setWhatWeFound(latestSummary?.what_we_found_text || '');
      setProblemAnalysis(latestSummary?.problem_analysis_content || '');
      setWhatWeWillDo(latestSummary?.what_we_will_do_text || '');
      setDemolitionContent(latestSummary?.demolition_content || '');

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
    if (!isDirty) {
      toast({ title: 'No changes', description: 'Nothing to save.' });
      return;
    }
    setSaving(true);
    try {
      const { data: { session: saveSession } } = await supabase.auth.getSession();
      const editorId = saveSession?.user?.id ?? null;

      // Stage 3.3: each save creates a new ai_summary_versions row (manual_edit)
      // and supersedes the previous active version. Race-safe: retries on
      // UNIQUE(inspection_id, version_number) violation.
      let newVersionId: string | null = null;
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const { data: maxRow, error: maxErr } = await supabase
          .from('ai_summary_versions')
          .select('version_number')
          .eq('inspection_id', inspection.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxErr) throw new Error(`version max query failed: ${maxErr.message}`);

        const previousMax = (maxRow?.version_number as number | undefined) ?? 0;
        const nextVersion = previousMax + 1;

        const { data: inserted, error: insertErr } = await supabase
          .from('ai_summary_versions')
          .insert({
            inspection_id: inspection.id,
            version_number: nextVersion,
            generation_type: 'manual_edit',
            generated_by: editorId,
            ai_summary_text: whatWeFound || null,
            what_we_found_text: whatWeFound || null,
            what_we_will_do_text: whatWeWillDo || null,
            problem_analysis_content: problemAnalysis || null,
            demolition_content: demolitionContent || null,
          })
          .select('id')
          .single();

        if (insertErr) {
          const isUniqueViolation = (insertErr as { code?: string }).code === '23505';
          if (isUniqueViolation && attempt < MAX_ATTEMPTS) continue;
          throw new Error(`version insert failed: ${insertErr.message}`);
        }

        newVersionId = inserted?.id as string;

        if (previousMax > 0) {
          const { error: supersedeErr } = await supabase
            .from('ai_summary_versions')
            .update({
              superseded_at: new Date().toISOString(),
              superseded_by_version_id: newVersionId,
            })
            .eq('inspection_id', inspection.id)
            .neq('id', newVersionId)
            .is('superseded_at', null);
          if (supersedeErr) {
            console.warn('[AIReview] supersession update failed:', supersedeErr.message);
          }
        }
        break;
      }

      // Stage 3.4.5: legacy inspections.ai_summary_* mirror dropped. The new
      // version row above is the canonical store; consumers read via
      // latest_ai_summary view.

      setIsDirty(false);
      toast({ title: 'Saved', description: 'A new version was created.' });
    } catch (err: any) {
      captureBusinessError('AI review save failed', { leadId, error: err?.message });
      toast({ title: 'Save Failed', description: err?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!leadId) return;
    // Save any pending changes first (creates a manual_edit version)
    if (isDirty) await handleSave();

    try {
      // Stage 3.4: stamp approval onto the latest active ai_summary_versions row.
      // Stage 3.4.5: inspections.ai_summary_approved mirror dropped — version
      // row's approved_at is the canonical signal.
      if (inspection?.id) {
        const { data: { session: approveSession } } = await supabase.auth.getSession();
        const approverId = approveSession?.user?.id ?? null;

        const { data: latestVersion, error: latestErr } = await supabase
          .from('ai_summary_versions')
          .select('id')
          .eq('inspection_id', inspection.id)
          .is('superseded_at', null)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestErr) {
          console.warn('[AIReview] latest version lookup failed:', latestErr.message);
        } else if (latestVersion?.id) {
          const { error: approveVersionErr } = await supabase
            .from('ai_summary_versions')
            .update({
              approved_at: new Date().toISOString(),
              approved_by: approverId,
            })
            .eq('id', latestVersion.id);
          if (approveVersionErr) {
            console.warn('[AIReview] version approval update failed:', approveVersionErr.message);
          }
        }
      }

      await supabase.from('leads').update({ status: 'approve_inspection_report' }).eq('id', leadId);
      await logFieldEdits({
        leadId,
        entityType: 'lead',
        entityId: leadId,
        changes: [{ field: 'status', old: lead?.status ?? null, new: 'approve_inspection_report' }],
      });
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      toast({ title: 'Approved', description: 'AI content approved. Lead moved to report approval stage.' });
      navigate('/admin/leads');
    } catch (err: any) {
      captureBusinessError('AI review approve failed', { leadId, error: err?.message });
      toast({ title: 'Error', description: err?.message || 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!leadId) return;
    if (!window.confirm('Reject AI summary and send back to technician for re-inspection?')) return;

    try {
      await supabase.from('leads').update({ status: 'inspection_waiting' }).eq('id', leadId);
      await logFieldEdits({
        leadId,
        entityType: 'lead',
        entityId: leadId,
        changes: [{ field: 'status', old: lead?.status ?? null, new: 'inspection_waiting' }],
        extraMetadata: { reason: 'ai_summary_rejected' },
      });
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      toast({ title: 'Rejected', description: 'Lead sent back to awaiting inspection.' });
      navigate('/admin/leads');
    } catch (err: any) {
      captureBusinessError('AI review reject failed', { leadId, error: err?.message });
      toast({ title: 'Error', description: err?.message || 'Failed to reject', variant: 'destructive' });
    }
  };

  const handleRegenerateAll = async () => {
    if (!inspection) return;
    setRegeneratingAll(true);
    try {
      const [inspectionRes, areasRes, subfloorRes] = await Promise.all([
        supabase.from('inspections').select('*').eq('id', inspection.id).single(),
        supabase.from('inspection_areas').select('*, moisture_readings(*)').eq('inspection_id', inspection.id).order('area_order'),
        supabase.from('subfloor_data').select('*').eq('inspection_id', inspection.id).maybeSingle(),
      ]);
      const fullInspection = inspectionRes.data;
      const fullAreas = areasRes.data;
      const subfloorData = subfloorRes.data;

      let subfloorReadings: any[] = [];
      if (subfloorData) {
        const { data: srData } = await supabase
          .from('subfloor_readings')
          .select('*')
          .eq('subfloor_id', subfloorData.id)
          .order('reading_order', { ascending: true });
        subfloorReadings = srData || [];
      }

      const payload = buildEdgeFunctionPayload(fullInspection, fullAreas || [], lead, subfloorData, subfloorReadings);
      const { data: { session: regenSession } } = await supabase.auth.getSession();
      const trimmedFeedback = feedbackText.trim();

      const { data, error } = await invokeEdgeFunction('generate-inspection-summary', {
        formData: payload,
        inspectionId: inspection.id,
        userId: regenSession?.user?.id,
        structured: true,
        regenerationFeedback: trimmedFeedback || undefined,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'AI generation failed');

      setWhatWeFound(data.what_we_found || '');
      setProblemAnalysis(data.detailed_analysis || '');
      setWhatWeWillDo(data.what_we_will_do || '');
      setDemolitionContent(data.demolition_details || '');
      setIsDirty(true);
      setFeedbackText('');

      toast({ title: 'Regenerated', description: 'All AI sections regenerated. Remember to save.' });
    } catch (err: any) {
      console.error('[AIReview] Regenerate all error:', err);
      toast({ title: 'Generation Failed', description: err?.message || 'Failed to regenerate', variant: 'destructive' });
    } finally {
      setRegeneratingAll(false);
    }
  };

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
      const previousContent = contentMap[section];

      const [inspectionRes, areasRes, subfloorRes] = await Promise.all([
        supabase.from('inspections').select('*').eq('id', inspection.id).single(),
        supabase.from('inspection_areas').select('*, moisture_readings(*)').eq('inspection_id', inspection.id).order('area_order'),
        supabase.from('subfloor_data').select('*').eq('inspection_id', inspection.id).maybeSingle(),
      ]);
      const fullInspection = inspectionRes.data;
      const fullAreas = areasRes.data;
      const subfloorData = subfloorRes.data;

      let subfloorReadings: any[] = [];
      if (subfloorData) {
        const { data: srData } = await supabase
          .from('subfloor_readings')
          .select('*')
          .eq('subfloor_id', subfloorData.id)
          .order('reading_order', { ascending: true });
        subfloorReadings = srData || [];
      }

      const payload = buildEdgeFunctionPayload(fullInspection, fullAreas || [], lead, subfloorData, subfloorReadings);
      const { data: { session: regenSession } } = await supabase.auth.getSession();
      const trimmedFeedback = sectionFeedback[section].trim();

      const { data, error } = await invokeEdgeFunction('generate-inspection-summary', {
        formData: payload,
        inspectionId: inspection.id,
        userId: regenSession?.user?.id,
        section,
        currentContent: previousContent,
        regenerationFeedback: trimmedFeedback || undefined,
      });

      if (error) throw error;

      const newContent = data?.summary || previousContent;
      if (section === 'whatWeFound') setWhatWeFound(newContent);
      else if (section === 'whatWeWillDo') setWhatWeWillDo(newContent);
      else if (section === 'detailedAnalysis') setProblemAnalysis(newContent);
      else if (section === 'demolitionDetails') setDemolitionContent(newContent);

      setIsDirty(true);
      setSectionFeedback((prev) => ({ ...prev, [section]: '' }));

      if (leadId) {
        await logFieldEdits({
          leadId,
          entityType: 'inspection',
          entityId: inspection.id,
          changes: [{
            field: SECTION_TO_DB_FIELD[section],
            old: previousContent || null,
            new: newContent || null,
          }],
          extraMetadata: {
            action: 'ai_section_regenerated',
            section_key: section,
            section_label: SECTION_LABELS[section],
            instruction_text: trimmedFeedback || null,
            version_id: data?.version_id ?? null,
            version_number: data?.version_number ?? null,
            generation_type: data?.generation_type ?? null,
          },
        });
        queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      }

      toast({ title: 'Section Regenerated', description: `Regenerated ${SECTION_LABELS[section]} section. Remember to save.` });
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
              <Menu className="h-5 w-5 text-slate-900" />
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/leads')}
                className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="flex w-10 h-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <MessageSquare className="h-5 w-5" />
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
                <X className="h-5 w-5" />
                Reject
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleApprove}
                className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Check className="h-5 w-5" />
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
                        <p className="text-sm text-slate-700 whitespace-pre-line">{lead.internal_notes}</p>
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

                {/* Regenerate-All feedback (optional). Per-section instructions live
                    inside each SectionCard. */}
                <div className="space-y-2">
                  <label htmlFor="ai-regen-feedback" className="text-sm font-medium text-slate-700">
                    Tell the AI what to change <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="ai-regen-feedback"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value.slice(0, 2000))}
                    placeholder="e.g. Make the recommendations more specific to the bedroom mould, mention the specific moisture readings"
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-y min-h-[72px]"
                  />
                  <p className="text-xs text-slate-500">
                    {feedbackText.length}/2000 — applies to Regenerate All Sections
                  </p>
                </div>

                {/* Regenerate All */}
                <button
                  onClick={handleRegenerateAll}
                  disabled={regeneratingAll}
                  className="w-full h-12 rounded-xl border-2 border-violet-300 text-violet-700 font-semibold flex items-center justify-center gap-2 hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  {regeneratingAll ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Regenerating All...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
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
                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                    <h3 className="text-lg font-semibold text-amber-800 mb-1">AI Content Not Generated</h3>
                    <p className="text-sm text-amber-700 mb-4">
                      The AI summary was not generated during inspection completion. Use "Regenerate All Sections" to generate content now.
                    </p>
                  </div>
                )}

                {/* 1. What We Found */}
                <SectionCard
                  title="What We Found"
                  icon={Search}
                  value={whatWeFound}
                  onChange={(v) => { setWhatWeFound(v); setIsDirty(true); }}
                  onRegenerate={() => handleRegenerateSection('whatWeFound')}
                  isRegenerating={regeneratingSection === 'whatWeFound'}
                  feedback={sectionFeedback.whatWeFound}
                  onFeedbackChange={(v) => setSectionFeedback((prev) => ({ ...prev, whatWeFound: v }))}
                  rows={4}
                />

                {/* 2. Problem Analysis & Recommendations */}
                <SectionCard
                  title="Problem Analysis & Recommendations"
                  icon={BarChart3}
                  value={problemAnalysis}
                  onChange={(v) => { setProblemAnalysis(v); setIsDirty(true); }}
                  onRegenerate={() => handleRegenerateSection('detailedAnalysis')}
                  isRegenerating={regeneratingSection === 'detailedAnalysis'}
                  feedback={sectionFeedback.detailedAnalysis}
                  onFeedbackChange={(v) => setSectionFeedback((prev) => ({ ...prev, detailedAnalysis: v }))}
                  rows={16}
                />

                {/* 3. What We're Going To Do */}
                <SectionCard
                  title="What We're Going To Do"
                  icon={Wrench}
                  value={whatWeWillDo}
                  onChange={(v) => { setWhatWeWillDo(v); setIsDirty(true); }}
                  onRegenerate={() => handleRegenerateSection('whatWeWillDo')}
                  isRegenerating={regeneratingSection === 'whatWeWillDo'}
                  feedback={sectionFeedback.whatWeWillDo}
                  onFeedbackChange={(v) => setSectionFeedback((prev) => ({ ...prev, whatWeWillDo: v }))}
                  rows={8}
                />

                {/* 4. Demolition Details (conditional) */}
                {hasDemolition && (
                  <SectionCard
                    title="Demolition Details"
                    icon={HardHat}
                    value={demolitionContent}
                    onChange={(v) => { setDemolitionContent(v); setIsDirty(true); }}
                    onRegenerate={() => handleRegenerateSection('demolitionDetails')}
                    isRegenerating={regeneratingSection === 'demolitionDetails'}
                    feedback={sectionFeedback.demolitionDetails}
                    onFeedbackChange={(v) => setSectionFeedback((prev) => ({ ...prev, demolitionDetails: v }))}
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
            <X className="h-5 w-5" />
            Reject
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex-1 h-12 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 h-12 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-1 shadow-sm"
          >
            <Check className="h-5 w-5" />
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
  icon: Icon,
  value,
  onChange,
  onRegenerate,
  isRegenerating,
  feedback,
  onFeedbackChange,
  rows = 6,
}: {
  title: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Icon className="h-5 w-5 text-violet-600" />
          {title}
        </h3>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="h-8 px-3 rounded-lg text-violet-600 text-sm font-medium hover:bg-violet-50 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </>
          )}
        </button>
      </div>
      <div className="px-5 pt-4 pb-2 space-y-1">
        <label className="text-xs font-medium text-slate-600 block">
          Tell the AI what to change for this section <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value.slice(0, 2000))}
          placeholder="e.g. Add more detail about the bedroom moisture readings"
          rows={2}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-y min-h-[60px]"
        />
        <p className="text-xs text-slate-400">{feedback.length}/2000 — applies only to this section</p>
      </div>
      <div className="px-5 pb-5 pt-2">
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

// Mirrors TechnicianInspectionForm.tsx:2458-2522 (buildAIPayload). Both surfaces must
// produce identical payload shapes so a regen from either AI Review or the tech form
// feeds the model the same prompt.
function buildEdgeFunctionPayload(
  inspection: any,
  areas: any[],
  lead: LeadData | null,
  subfloorData: any | null,
  subfloorReadings: any[],
) {
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
      mouldDescription: (() => {
        const parts: string[] = [];
        if (a.mould_visible_locations?.length) parts.push(a.mould_visible_locations.join(', '));
        if (a.mould_visible_custom) parts.push(a.mould_visible_custom);
        return parts.length ? parts.join('. ') : a.mould_description;
      })(),
      mouldVisibility: a.mould_visible_locations || [],
      commentsForReport: a.comments || '',
      temperature: a.temperature,
      humidity: a.humidity,
      dewPoint: a.dew_point,
      timeWithoutDemo: a.job_time_minutes ? a.job_time_minutes / 60 : 0,
      demolitionRequired: a.demolition_required,
      demolitionTime: a.demolition_time_minutes ? a.demolition_time_minutes / 60 : 0,
      demolitionDescription: a.demolition_description,
      moistureReadings: (a.moisture_readings || []).map((r: any) => ({
        title: r.title,
        reading: r.moisture_percentage?.toString(),
      })),
      externalMoisture: a.external_moisture,
      extraNotes: a.extra_notes,
      infraredEnabled: a.infrared_enabled,
      infraredObservations: reconstructInfraredObservations(a),
    })),
    subfloorObservations: subfloorData?.observations || '',
    subfloorComments: subfloorData?.comments || '',
    subfloorLandscape: subfloorData?.landscape || '',
    subfloorSanitation: subfloorData?.sanitation_required || false,
    subfloorTreatmentTime: subfloorData?.treatment_time_minutes
      ? subfloorData.treatment_time_minutes / 60
      : 0,
    subfloorReadings: subfloorReadings.map((r: any) => ({
      reading: r.moisture_percentage?.toString(),
      location: r.location,
    })),
    outdoorTemperature: inspection?.outdoor_temperature?.toString(),
    outdoorHumidity: inspection?.outdoor_humidity?.toString(),
    outdoorDewPoint: inspection?.outdoor_dew_point?.toString(),
    outdoorComments: inspection?.outdoor_comments,
    wasteDisposalEnabled: inspection?.waste_disposal_required,
    wasteDisposalAmount: inspection?.waste_disposal_amount,
    optionSelected: inspection?.option_selected,
    treatmentMethods: inspection?.treatment_methods,
    commercialDehumidifierEnabled: (inspection?.commercial_dehumidifier_qty ?? 0) > 0,
    commercialDehumidifierQty: inspection?.commercial_dehumidifier_qty,
    airMoversEnabled: (inspection?.air_movers_qty ?? 0) > 0,
    airMoversQty: inspection?.air_movers_qty,
    rcdBoxEnabled: (inspection?.rcd_box_qty ?? 0) > 0,
    rcdBoxQty: inspection?.rcd_box_qty,
    recommendDehumidifier: !!inspection?.recommended_dehumidifier,
    dehumidifierSize: inspection?.recommended_dehumidifier,
    causeOfMould: inspection?.cause_of_mould,
    additionalInfoForTech: inspection?.additional_info_technician,
    additionalEquipmentComments: inspection?.additional_equipment_comments,
    parkingOptions: inspection?.parking_option,
    laborCost: inspection?.labour_cost_ex_gst,
    equipmentCost: inspection?.equipment_cost_ex_gst,
    subtotalExGst: inspection?.subtotal_ex_gst,
    gstAmount: inspection?.gst_amount,
    totalIncGst: inspection?.total_inc_gst,
  };
}
