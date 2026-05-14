import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  User,
  Home,
  AlertCircle,
  ChevronRight,
  Phone,
  Mail
} from 'lucide-react';
import type { InspectionLead } from '@/hooks/useInspectionLeads';

interface InspectionJobCardProps {
  lead: InspectionLead;
}

/**
 * InspectionJobCard Component
 *
 * Displays lead information as a mobile-friendly job card for technicians
 * to select for inspection. Optimized for touch interactions with ≥48px targets.
 *
 * Features:
 * - Lead details: name, address, property type, issue
 * - Contact information
 * - "Start Inspection" button with navigation
 * - Mobile-first responsive design (375px → 768px → 1440px)
 */
export function InspectionJobCard({ lead }: InspectionJobCardProps) {
  const navigate = useNavigate();

  const handleStartInspection = () => {
    navigate(`/technician/inspection?leadId=${lead.id}`);
  };

  // Format address for display
  const fullAddress = [
    lead.property_address_street,
    lead.property_address_suburb,
    lead.property_address_state,
    lead.property_address_postcode
  ].filter(Boolean).join(', ');

  // Format property type for display
  const propertyTypeLabel = lead.property_type === 'residential'
    ? 'Residential'
    : lead.property_type === 'commercial'
    ? 'Commercial'
    : 'Property';

  return (
    <Card className="w-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">
            {lead.lead_number}
          </span>
          {lead.lead_source === 'hipages' && (
            <Badge variant="outline" className="text-xs">
              HiPages
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Name */}
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {lead.full_name}
            </p>
            <div className="flex flex-col gap-1 mt-1">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" />
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                >
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Property Address */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {fullAddress}
            </p>
          </div>
        </div>

        {/* Property Type */}
        <div className="flex items-center gap-3">
          <Home className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            {propertyTypeLabel}
          </p>
        </div>

        {/* Issue Description */}
        {lead.issue_description && (
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {lead.issue_description}
              </p>
            </div>
          </div>
        )}

        {/* Start Inspection Button */}
        <Button
          onClick={handleStartInspection}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          Start Inspection
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
