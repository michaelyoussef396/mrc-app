/**
 * Page controls for the lead list. Replaces "Load More", which could only ever
 * append to the end and gave no way to reach a lead deep in the pipeline.
 *
 * Targets are 48px so they stay usable in gloves at 375px.
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface LeadsPaginationProps {
  /** Zero-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const BUTTON_CLASS =
  'h-12 w-12 flex items-center justify-center rounded-lg border border-slate-200 bg-white ' +
  'text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/40 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white';

export default function LeadsPagination({
  page,
  pageCount,
  onPageChange,
  disabled = false,
}: LeadsPaginationProps) {
  if (pageCount <= 1) return null;

  const isFirst = page <= 0;
  const isLast = page >= pageCount - 1;

  return (
    <nav
      aria-label="Lead list pages"
      className="flex items-center justify-center gap-2 py-4 border-t border-slate-200"
    >
      <button
        type="button"
        onClick={() => onPageChange(0)}
        disabled={disabled || isFirst}
        aria-label="First page"
        className={BUTTON_CLASS}
      >
        <ChevronsLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || isFirst}
        aria-label="Previous page"
        className={BUTTON_CLASS}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <p aria-live="polite" className="px-3 text-sm text-slate-600 whitespace-nowrap">
        Page <span className="font-medium text-slate-900">{page + 1}</span> of{' '}
        <span className="font-medium text-slate-900">{pageCount}</span>
      </p>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || isLast}
        aria-label="Next page"
        className={BUTTON_CLASS}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => onPageChange(pageCount - 1)}
        disabled={disabled || isLast}
        aria-label="Last page"
        className={BUTTON_CLASS}
      >
        <ChevronsRight className="w-5 h-5" />
      </button>
    </nav>
  );
}
