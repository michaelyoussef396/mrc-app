import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { syncManager } from "@/lib/offline/SyncManager";

interface FormRecoveryToastProps {
  leadId: string;
  onRecover: (formData: Record<string, unknown>) => void;
}

export default function FormRecoveryToast({ leadId, onRecover }: FormRecoveryToastProps) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkForDraft = async () => {
      try {
        const draft = await syncManager.getDraftByLeadId(leadId);
        if (draft && (draft.status === 'pending' || draft.status === 'error')) {
          toast("Recover unsaved inspection data?", {
            duration: Infinity,
            action: {
              label: "Recover",
              onClick: () => onRecover(draft.formData),
            },
            cancel: {
              label: "Dismiss",
              onClick: () => {
                syncManager.deleteDraft(draft.id);
              },
            },
          });
        }
      } catch {
        // IndexedDB not available
      }
    };

    checkForDraft();
  }, [leadId, onRecover]);

  return null;
}
