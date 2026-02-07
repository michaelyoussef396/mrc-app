/**
 * CreateLeadCard Component
 * Dashed border card for creating a new lead
 */

interface CreateLeadCardProps {
  onClick: () => void;
}

export default function CreateLeadCard({ onClick }: CreateLeadCardProps) {
  return (
    <button
      onClick={onClick}
      className="
        min-h-[200px] rounded-xl border-2 border-dashed border-slate-200
        bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-300
        transition-all duration-200
        flex flex-col items-center justify-center gap-3
        cursor-pointer group
      "
    >
      {/* Plus icon */}
      <div
        className="
          w-12 h-12 rounded-full bg-white border border-slate-200
          flex items-center justify-center
          group-hover:bg-blue-50 group-hover:border-blue-200
          transition-colors
        "
      >
        <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-blue-600 transition-colors">
          add
        </span>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
          Create New Lead
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Add a customer to your pipeline
        </p>
      </div>
    </button>
  );
}
