import { useState } from "react";

interface RetryButtonProps {
  onRetry: () => Promise<void>;
  error: string;
  maxAttempts?: number;
}

export default function RetryButton({ onRetry, error, maxAttempts = 3 }: RetryButtonProps) {
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const handleRetry = async () => {
    if (attempt >= maxAttempts) return;
    setRetrying(true);
    setAttempt(prev => prev + 1);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const exhausted = attempt >= maxAttempts;

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
      <p className="text-sm text-red-700">{error}</p>
      {exhausted ? (
        <p className="text-xs text-red-500">
          Max retries reached. Please try again later or call 1800 954 117.
        </p>
      ) : (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-5 py-2 bg-red-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
          style={{ minHeight: "48px", minWidth: "48px" }}
        >
          {retrying ? "Retrying..." : `Retry${attempt > 0 ? ` (${attempt}/${maxAttempts})` : ""}`}
        </button>
      )}
    </div>
  );
}
