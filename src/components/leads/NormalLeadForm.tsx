/**
 * NormalLeadForm - Complete Lead Entry Component
 *
 * Comprehensive 8-field form for normal lead workflow
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Character counter for description (live: "X/1000 characters")
 * - Auto-format phone on blur
 * - Loading state during submission
 * - Back button returns to selector
 * - Toast notifications for success/error
 * - Mobile-first responsive design
 * - shadcn/ui Select component for urgency dropdown
 *
 * Fields:
 * 1. Full Name (required)
 * 2. Phone (required, auto-formatted)
 * 3. Email (required, normalized)
 * 4. Street Address (required)
 * 5. Suburb (required, Title Case)
 * 6. Postcode (required, Victorian)
 * 7. Booking Urgency (required, dropdown)
 * 8. Issue Description (required, 20-1000 chars with counter)
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  normalLeadSchema,
  formatPhoneNumber,
  formatSuburbName,
} from '@/lib/validators/lead-creation.schemas';
import { URGENCY_OPTIONS } from '@/types/lead-creation.types';
import type { NormalLeadSchemaType } from '@/lib/validators/lead-creation.schemas';

// ============================================================================
// TYPES
// ============================================================================

interface NormalLeadFormProps {
  onSuccess: () => void;
  onBack?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NormalLeadForm({
  onSuccess,
  onBack,
}: NormalLeadFormProps): React.ReactElement {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [charCount, setCharCount] = React.useState<number>(0);
  const [showOtherSource, setShowOtherSource] = React.useState<boolean>(false);
  const [otherSourceText, setOtherSourceText] = React.useState<string>('');

  // ============================================================================
  // FORM SETUP
  // ============================================================================

  const form = useForm<NormalLeadSchemaType>({
    resolver: zodResolver(normalLeadSchema),
    mode: 'onBlur',
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      street: '',
      suburb: '',
      postcode: '',
      urgency: undefined,
      issue_description: '',
      property_type: undefined,
      notes: undefined,
      lead_source: 'website',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  // Watch issue_description for character counter
  const issueDescription = watch('issue_description');

  React.useEffect(() => {
    setCharCount(issueDescription?.length || 0);
  }, [issueDescription]);

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
  const onSubmit = async (data: NormalLeadSchemaType): Promise<void> => {
    try {
      setIsLoading(true);

      // Insert lead into Supabase
      const { data: leadData, error } = await supabase
        .from('leads')
        .insert({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          property_address_street: data.street,
          property_address_suburb: data.suburb,
          property_address_postcode: data.postcode,
          property_address_state: 'VIC',
          urgency: data.urgency,
          issue_description: data.issue_description,
          property_type: data.property_type,
          lead_source: data.lead_source || 'website',
          lead_source_other: data.lead_source === 'other' ? otherSourceText : null,
          status: 'new_lead',
          notes: data.notes,
        })
        .select('id, lead_number, full_name, email')
        .single();

      if (error) {
        throw new Error(`Failed to create lead: ${error.message}`);
      }

      // Show success toast
      toast({
        title: 'Success!',
        description: `Lead created successfully! Reference: ${
          leadData.lead_number || 'Pending'
        }. Confirmation email sent.`,
        variant: 'default',
      });

      // Call onSuccess callback
      onSuccess();
    } catch (error) {
      console.error('Error creating normal lead:', error);

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
   * Render text input field with label and error message
   */
  const renderTextField = (
    name: keyof NormalLeadSchemaType,
    label: string,
    placeholder: string,
    type: string = 'text',
    maxLength?: number,
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  ): React.ReactElement => {
    const error = errors[name];
    const inputId = `normal-${name}`;

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
          {...register(name as any)}
          onBlur={onBlur}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-red-500 mt-1"
            role="alert"
          >
            {error.message as string}
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
      {/* Full Name */}
      {renderTextField('full_name', 'Full Name *', 'John Smith')}

      {/* Phone */}
      {renderTextField(
        'phone',
        'Phone *',
        '04XX XXX XXX',
        'tel',
        undefined,
        handlePhoneBlur
      )}

      {/* Email */}
      {renderTextField(
        'email',
        'Email *',
        'customer@example.com',
        'email',
        undefined,
        handleEmailBlur
      )}

      {/* Street Address */}
      {renderTextField('street', 'Street Address *', '123 Main Street')}

      {/* Suburb */}
      {renderTextField(
        'suburb',
        'Suburb *',
        'Melbourne',
        'text',
        undefined,
        handleSuburbBlur
      )}

      {/* Postcode */}
      {renderTextField('postcode', 'Postcode *', '3XXX', 'text', 4)}

      {/* Booking Urgency - Select Dropdown */}
      <div className="space-y-2">
        <Label
          htmlFor="normal-urgency"
          className="text-sm font-medium text-gray-700"
        >
          Urgency *
        </Label>
        <Controller
          name="urgency"
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isLoading}
            >
              <SelectTrigger
                id="normal-urgency"
                className={`
                  h-12 px-3 text-base
                  ${errors.urgency ? 'border-red-500 focus:ring-red-500' : ''}
                `}
                aria-required="true"
                aria-invalid={errors.urgency ? 'true' : 'false'}
                aria-describedby={
                  errors.urgency ? 'normal-urgency-error' : undefined
                }
              >
                <SelectValue placeholder="Select urgency level" />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.urgency && (
          <p
            id="normal-urgency-error"
            className="text-sm text-red-500 mt-1"
            role="alert"
          >
            {errors.urgency.message}
          </p>
        )}
      </div>

      {/* Issue Description - Textarea with Character Counter */}
      <div className="space-y-2">
        <Label
          htmlFor="normal-issue_description"
          className="text-sm font-medium text-gray-700"
        >
          Issue Description *
        </Label>
        <Textarea
          id="normal-issue_description"
          placeholder="Please describe the mould issue, location, and any other relevant details..."
          rows={4}
          maxLength={1000}
          disabled={isLoading}
          className={`
            px-3 py-2 text-base resize-none
            ${
              errors.issue_description
                ? 'border-red-500 focus:ring-red-500'
                : ''
            }
          `}
          aria-required="true"
          aria-invalid={errors.issue_description ? 'true' : 'false'}
          aria-describedby={
            errors.issue_description
              ? 'normal-issue_description-error'
              : 'normal-issue_description-counter'
          }
          {...register('issue_description')}
        />
        {/* Character Counter */}
        <div className="flex justify-between items-center">
          {errors.issue_description ? (
            <p
              id="normal-issue_description-error"
              className="text-sm text-red-500"
              role="alert"
            >
              {errors.issue_description.message}
            </p>
          ) : (
            <div />
          )}
          <p
            id="normal-issue_description-counter"
            className={`text-sm ${
              charCount > 1000
                ? 'text-red-500'
                : charCount > 900
                ? 'text-orange-500'
                : 'text-gray-500'
            }`}
            aria-live="polite"
          >
            {charCount}/1000 characters
          </p>
        </div>
      </div>

      {/* Lead Source - Select Dropdown */}
      <div className="space-y-2">
        <Label
          htmlFor="normal-lead_source"
          className="text-sm font-medium text-gray-700"
        >
          Source *
        </Label>
        <Controller
          name="lead_source"
          control={control}
          render={({ field }) => (
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                if (value === 'other') {
                  setShowOtherSource(true);
                } else {
                  setShowOtherSource(false);
                  setOtherSourceText('');
                }
              }}
              value={field.value}
              disabled={isLoading}
            >
              <SelectTrigger
                id="normal-lead_source"
                className="h-12 px-3 text-base"
              >
                <SelectValue placeholder="How did this lead come to us?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="hipages">HiPages</SelectItem>
                <SelectItem value="google">Google Search</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="repeat">Repeat Customer</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        {/* Conditional "Other" text field */}
        {showOtherSource && (
          <div className="mt-2">
            <Input
              placeholder="Please specify the source"
              value={otherSourceText}
              onChange={(e) => setOtherSourceText(e.target.value)}
              className="h-12 px-3 text-base"
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4 pb-4">
        {/* Back Button - only show if onBack provided */}
        {onBack && (
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
        )}

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
            'Create Lead'
          )}
        </Button>
      </div>
    </form>
  );
}
