import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useJobCompletionForm } from '@/hooks/useJobCompletionForm'
import {
  Section1OfficeInfo,
  Section2Summary,
  Section3BeforePhotos,
  Section4AfterPhotos,
  Section5TreatmentMethods,
  Section6ChemicalToggles,
  Section7Equipment,
  Section8Variations,
  Section9JobNotes,
  Section10OfficeNotes,
} from '@/components/job-completion'
import { Loader2, ArrowLeft, Save, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const TOTAL_SECTIONS = 10

const SECTION_TITLES = [
  'Office Info',
  'Summary',
  'Before Photos',
  'After Photos',
  'Treatment Methods',
  'Chemical Toggles',
  'Equipment Used',
  'Variations',
  'Job Notes',
  'Office Notes',
]

export default function JobCompletionForm() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const isAdmin = hasRole('admin')

  const {
    formData,
    jobCompletionId,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    currentSection,
    setCurrentSection,
    handleChange,
    handleSave,
    handleSubmit,
    error,
  } = useJobCompletionForm(leadId || '')

  if (!leadId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f8]">
        <p className="text-[#86868b]">No lead ID provided.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7f8] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
        <p className="text-[#86868b] text-sm">Loading job completion form...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7f8] gap-3 p-4">
        <p className="text-red-600 text-center">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-[#007AFF] text-sm font-medium"
        >
          Go Back
        </button>
      </div>
    )
  }

  const progressPercent = Math.round((currentSection / TOTAL_SECTIONS) * 100)

  const handleBack = () => {
    if (hasUnsavedChanges) {
      handleSave()
    }
    navigate(-1)
  }

  const handlePrevious = () => {
    if (hasUnsavedChanges) handleSave()
    if (currentSection > 1) setCurrentSection(currentSection - 1)
  }

  const handleNext = () => {
    if (hasUnsavedChanges) handleSave()
    if (currentSection < TOTAL_SECTIONS) setCurrentSection(currentSection + 1)
  }

  const handleComplete = async () => {
    // Validate required fields
    if (!formData.swmsCompleted) {
      toast.error('SWMS must be completed before submitting')
      setCurrentSection(2)
      return
    }
    if (!formData.premisesType) {
      toast.error('Premises type is required')
      setCurrentSection(2)
      return
    }
    if (!formData.completionDate) {
      toast.error('Completion date is required')
      setCurrentSection(2)
      return
    }

    try {
      await handleSubmit()
      toast.success(
        formData.requestReview
          ? 'Job flagged for admin review'
          : 'Job completion submitted successfully'
      )
      navigate(`/technician/job/${leadId}`)
    } catch {
      toast.error('Failed to submit job completion')
    }
  }

  const renderSection = () => {
    const props = { formData, onChange: handleChange }

    switch (currentSection) {
      case 1: return <Section1OfficeInfo {...props} />
      case 2: return <Section2Summary {...props} />
      case 3: return <Section3BeforePhotos {...props} leadId={leadId} jobCompletionId={jobCompletionId} />
      case 4: return <Section4AfterPhotos {...props} />
      case 5: return <Section5TreatmentMethods {...props} />
      case 6: return <Section6ChemicalToggles {...props} />
      case 7: return <Section7Equipment {...props} />
      case 8: return <Section8Variations {...props} />
      case 9: return <Section9JobNotes {...props} />
      case 10: return <Section10OfficeNotes {...props} isAdmin={isAdmin} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-[160px]">
      {/* ───── Sticky Header ───── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-lg"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-[#1d1d1f]" />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-[15px] font-semibold text-[#1d1d1f] truncate">
              Job Completion
            </h1>
            <p className="text-[11px] text-[#86868b]">
              Section {currentSection} of {TOTAL_SECTIONS}
            </p>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center justify-center w-11 h-11 -mr-2 rounded-lg disabled:opacity-40"
            aria-label="Save"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#007AFF]" />
            ) : (
              <Save className="h-5 w-5 text-[#007AFF]" />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#007AFF] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* ───── Section Title Bar ───── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
          {SECTION_TITLES[currentSection - 1]}
        </h2>
        {formData.jobNumber && (
          <p className="text-[13px] text-[#86868b] mt-0.5">
            {formData.jobNumber}
          </p>
        )}
      </div>

      {/* ───── Section Content ───── */}
      <main className="flex-1 p-4 space-y-5">
        {renderSection()}
      </main>

      {/* ───── Fixed Footer ───── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] z-50">
        <div className="max-w-md mx-auto space-y-2">
          {/* Section navigation dots */}
          <div className="flex justify-center gap-1.5 pb-1">
            {Array.from({ length: TOTAL_SECTIONS }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (hasUnsavedChanges) handleSave()
                  setCurrentSection(i + 1)
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 === currentSection
                    ? 'bg-[#007AFF] w-4'
                    : i + 1 < currentSection
                    ? 'bg-[#34C759]'
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to section ${i + 1}: ${SECTION_TITLES[i]}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentSection > 1 && (
              <button
                onClick={handlePrevious}
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-[#1d1d1f] font-medium text-[15px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
            )}

            {currentSection < TOTAL_SECTIONS ? (
              <button
                onClick={handleNext}
                className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] text-white font-medium text-[15px] ${
                  currentSection === 1 ? 'w-full' : ''
                }`}
              >
                Next Section
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-[#34C759] text-white font-medium text-[15px] disabled:opacity-50"
              >
                <CheckCircle2 className="h-5 w-5" />
                {isSaving ? 'Submitting...' : 'Complete'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
