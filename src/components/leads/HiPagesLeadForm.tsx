/**
 * HiPagesLeadForm - Simplified Lead Entry Component
 *
 * Quick 4-field form for HiPages marketplace leads
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Auto-format phone number on blur
 * - All inputs min-height: 48px, font-size: 16px (prevents iOS zoom)
 * - Loading state during submission
 * - Back button returns to selector
 * - Toast notifications for success/error
 * - Mobile-first responsive design
 *
 * Fields:
 * 1. Suburb (required)
 * 2. Postcode (required, Victorian only)
 * 3. Phone (required, auto-formatted)
 * 4. Email (required, normalized to lowercase)
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  hiPagesLeadSchema,
  formatPhoneNumber,
  formatSuburbName,
} from '@/lib/validators/lead-creation.schemas';
import type { HiPagesLeadSchemaType } from '@/lib/validators/lead-creation.schemas';

// ============================================================================
// TYPES
// ============================================================================

interface HiPagesLeadFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HiPagesLeadForm({
  onSuccess,
  onBack,
}: HiPagesLeadFormProps): React.ReactElement {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // ============================================================================
  // FORM SETUP
  // ============================================================================

  const form = useForm<HiPagesLeadSchemaType>({
    resolver: zodResolver(hiPagesLeadSchema),
    mode: 'onBlur',
    defaultValues: {
      suburb: '',
      postcode: '',
      phone: '',
      email: '',
      full_name: undefined,
      notes: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Auto-format phone number on blur
   */
  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value) {
      const formatted = formatPhoneNumber(value);
      setValue('phone', formatted, { shouldValidate: true });
    }
  };

  /**
   * Transform suburb to Title Case on blur
   */
  const handleSuburbBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value) {
      const formatted = formatSuburbName(value);
      setValue('suburb', formatted, { shouldValidate: true });
    }
  };

  /**
   * Transform email to lowercase on blur
   */
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value) {
      setValue('email', value.toLowerCase().trim(), { shouldValidate: true });
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: HiPagesLeadSchemaType): Promise<void> => {
    try {
      setIsLoading(true);

      // Insert lead into Supabase
      const { data: leadData, error } = await supabase
        .from('leads')
        .insert({
          full_name: data.full_name || 'HiPages Lead',
          email: data.email,
          phone: data.phone,
          property_address_street: 'To be confirmed',
          property_address_suburb: data.suburb,
          property_address_postcode: data.postcode,
          property_address_state: 'VIC',
          lead_source: 'hipages',
          status: 'hipages_lead', // HiPages leads get separate pipeline status
          notes: data.notes,
        })
        .select('id, lead_number, full_name, email, property_address_suburb')
        .single();

      if (error) {
        throw new Error(`Failed to create lead: ${error.message}`);
      }

      // Show success toast
      toast({
        title: 'Success!',
        description: `HiPages lead created successfully! Reference: ${
          leadData.lead_number || 'Pending'
        }`,
        variant: 'default',
      });

      // Call onSuccess callback
      onSuccess();
    } catch (error) {
      console.error('Error creating HiPages lead:', error);

      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description:
            'An unexpected error occurred. Please try again or call us at 1800 954 117.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Render form field with label and error message
   */
  const renderField = (
    name: keyof HiPagesLeadSchemaType,
    label: string,
    placeholder: string,
    type: string = 'text',
    maxLength?: number,
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  ): React.ReactElement => {
    const error = errors[name];
    const inputId = `hipages-${name}`;

    return (
      <div className="space-y-2">
        <Label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </Label>
        <Input
          id={inputId}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isLoading}
          className={`
            h-12 px-3 text-base
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
          `}
          aria-required="true"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...register(name)}
          onBlur={onBlur}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-red-500 mt-1"
            role="alert"
          >
            {error.message}
          </p>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Suburb */}
      {renderField(
        'suburb',
        'Suburb *',
        'e.g., Melbourne, Carlton, Richmond',
        'text',
        undefined,
        handleSuburbBlur
      )}

      {/* Postcode */}
      {renderField(
        'postcode',
        'Postcode *',
        '3XXX',
        'text',
        4
      )}

      {/* Phone */}
      {renderField(
        'phone',
        'Phone *',
        '04XX XXX XXX',
        'tel',
        undefined,
        handlePhoneBlur
      )}

      {/* Email */}
      {renderField(
        'email',
        'Email *',
        'customer@example.com',
        'email',
        undefined,
        handleEmailBlur
      )}

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        {/* Back Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="w-full sm:w-auto h-12 px-6 text-base font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          disabled={isLoading}
          className="w-full sm:flex-1 h-12 px-6 text-base font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create HiPages Lead'
          )}
        </Button>
      </div>
    </form>
  );
}
