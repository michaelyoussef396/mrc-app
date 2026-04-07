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
import { Loader2, ChevronLeft } from 'lucide-react'
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
  const sectionTitle = SECTION_TITLES[currentSection - 1] || 'Job Completion'
  const isLastSection = currentSection === TOTAL_SECTIONS
  const showPrevious = currentSection > 1

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
      case 4: return <Section4AfterPhotos {...props} leadId={leadId} jobCompletionId={jobCompletionId} />
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
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center p-2 -ml-2 text-[#007AFF] hover:bg-gray-100 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-3xl">chevron_left</span>
          </button>
          <h1 className="text-lg font-bold leading-tight flex-1 text-center text-[#1d1d1f]">
            {sectionTitle}
          </h1>
          <button
            onClick={() => handleSave()}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center justify-center p-2 -mr-2 text-[#007AFF] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            style={{ minWidth: '44px', minHeight: '44px' }}
            aria-label="Save"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-2xl">save</span>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wide">
              Section {currentSection} of {TOTAL_SECTIONS}
            </span>
            <span className="text-xs font-medium text-[#007AFF]">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* ───── Section Content ───── */}
      <main className="flex-1 p-4 space-y-6">
        {renderSection()}
      </main>

      {/* ───── Fixed Footer ───── */}
      <footer
        className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="w-full h-14 bg-[#007AFF] text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Save
              </>
            )}
          </button>

          <div className="flex gap-3">
            {showPrevious && (
              <button
                onClick={handlePrevious}
                className="flex-1 text-center text-[#007AFF] font-semibold text-base py-2 flex items-center justify-center gap-1 active:opacity-70 bg-gray-100 rounded-lg"
                style={{ minHeight: '48px' }}
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </button>
            )}
            <button
              onClick={isLastSection ? handleComplete : handleNext}
              className={`${showPrevious ? 'flex-1' : 'w-full'} text-center text-[#007AFF] font-semibold text-base py-2 flex items-center justify-center gap-1 active:opacity-70`}
              style={{ minHeight: '48px' }}
            >
              {isLastSection ? 'Complete' : 'Next Section'}
              <span className="material-symbols-outlined text-lg">
                {isLastSection ? 'check_circle' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
