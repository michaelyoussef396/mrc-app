import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeadSearch, SearchLead } from '@/hooks/useLeadSearch';

interface AdminSearchBarProps {
  /** Optional: Compact mode for mobile */
  compact?: boolean;
  /** Optional: Callback when search closes */
  onClose?: () => void;
}

export default function AdminSearchBar({ compact = false, onClose }: AdminSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { leads, totalCount, isLoading, error } = useLeadSearch(query);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [leads]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || leads.length === 0) {
        if (e.key === 'Escape') {
          setIsOpen(false);
          inputRef.current?.blur();
          onClose?.();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, leads.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && leads[selectedIndex]) {
            handleSelectLead(leads[selectedIndex].id);
          } else if (leads.length > 0) {
            // If no selection, select first result
            handleSelectLead(leads[0].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          onClose?.();
          break;
      }
    },
    [isOpen, leads, selectedIndex, onClose]
  );

  const handleSelectLead = (leadId: string) => {
    setIsOpen(false);
    setQuery('');
    onClose?.();
    navigate(`/leads/${leadId}`);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    onClose?.();
    navigate(`/admin/leads?search=${encodeURIComponent(query)}`);
  };

  // Status pill colors matching the MRC design system
  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase().replace(/_/g, ' ');
    switch (statusLower) {
      case 'new lead':
      case 'hipages lead':
        return 'bg-blue-100 text-blue-700';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-700';
      case 'inspection waiting':
      case 'inspection scheduled':
        return 'bg-purple-100 text-purple-700';
      case 'inspection completed':
      case 'inspection report pdf completed':
        return 'bg-green-100 text-green-700';
      case 'job waiting':
      case 'job scheduled':
        return 'bg-orange-100 text-orange-700';
      case 'job completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'invoicing sent':
        return 'bg-cyan-100 text-cyan-700';
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'closed':
      case 'not landed':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status
      ?.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Highlight matching text in results
  const highlightMatch = (text: string | null | undefined, searchQuery: string) => {
    if (!searchQuery || !text) return text || '';

    const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    let result = text;

    // Create a regex that matches any of the search words
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

    const parts = result.split(regex);
    return parts.map((part, i) =>
      words.some(w => part.toLowerCase() === w) ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Get initials from full name
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${compact ? 'flex-1' : 'w-[200px] lg:w-[280px]'}`}>
      {/* Search Input */}
      <div className="relative">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
          style={{ fontSize: '20px', color: '#86868b' }}
        >
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads..."
          autoFocus={compact}
          className={`w-full ${compact ? 'h-12' : 'h-11'} pl-10 pr-10 rounded-xl bg-white text-sm outline-none transition-all focus:ring-2 focus:ring-[#007AFF]/20`}
          style={{
            color: '#1d1d1f',
            border: '1px solid #e5e5e5',
          }}
        />
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* Clear button */}
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#666' }}>
              close
            </span>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg overflow-hidden z-50"
          style={{ border: '1px solid #e5e5e5' }}
        >
          {error ? (
            <div className="p-4 text-center text-red-500 text-sm">{error}</div>
          ) : leads.length === 0 && !isLoading ? (
            <div className="p-4 text-center text-sm" style={{ color: '#86868b' }}>
              No leads found for "{query}"
            </div>
          ) : (
            <>
              {/* Results List */}
              <div className="max-h-[400px] overflow-y-auto">
                {leads.map((lead, index) => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectLead(lead.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      selectedIndex === index ? 'bg-[#f5f7f8]' : 'hover:bg-[#f5f7f8]'
                    }`}
                  >
                    {/* Avatar/Initials */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                      style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)', color: '#007AFF' }}
                    >
                      {getInitials(lead.full_name)}
                    </div>

                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate" style={{ color: '#1d1d1f' }}>
                          {highlightMatch(lead.full_name, query)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase flex-shrink-0 ${getStatusColor(
                            lead.status
                          )}`}
                        >
                          {formatStatus(lead.status)}
                        </span>
                      </div>
                      <div className="text-xs truncate" style={{ color: '#86868b' }}>
                        {highlightMatch(
                          `${lead.property_address_street}, ${lead.property_address_suburb}`,
                          query
                        )}
                      </div>
                      {lead.phone && (
                        <div className="text-xs" style={{ color: '#86868b' }}>
                          {highlightMatch(lead.phone, query)}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-xs flex-shrink-0" style={{ color: '#86868b' }}>
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : ''}
                    </div>

                    {/* Chevron */}
                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '18px', color: '#86868b' }}>
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>

              {/* View All Link */}
              {totalCount > 8 && (
                <button
                  onClick={handleViewAll}
                  className="w-full p-3 text-center text-sm font-semibold hover:bg-[#f5f7f8] border-t transition-colors"
                  style={{ color: '#007AFF', borderColor: '#f0f0f0' }}
                >
                  View all {totalCount} results
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
