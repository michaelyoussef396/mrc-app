import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  requestInspectionSchema,
  type RequestInspectionSchemaType,
} from '@/lib/validators/lead-creation.schemas';
import { submitPublicLead, uploadLeadPhotos } from '@/lib/api/public-leads';

// --- Select option sets -----------------------------------------------------

const PREFERRED_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Flexible (Any Day)',
];

const PREFERRED_TIMES = [
  'Morning (8am–12pm)', 'Midday (12pm–2pm)', 'Afternoon (2pm–5pm)', 'Evening (5pm–7pm)',
];

const ISSUE_TYPES = [
  'Mould Growth', 'Water Damage / Flood', 'Subfloor Inspection',
  'Pre-Purchase Inspection', 'Other',
];

const URGENCY_LEVELS = [
  'Emergency (active water or health concern)',
  'Urgent (within 48 hours)',
  'Flexible (this week or later)',
];

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Construction'];

// --- Photo upload constraints -----------------------------------------------
// NOTE: Bucket 'lead-enquiry-photos' must be created manually in Supabase Studio
// with public=false and an INSERT policy for the anon role. Admin SELECT only.

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Small red asterisk marking a required field. */
function RequiredMark() {
  return <span className="ml-0.5 text-sm text-red-600">*</span>;
}

const RequestInspection = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const form = useForm<RequestInspectionSchemaType>({
    resolver: zodResolver(requestInspectionSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      property_address: '',
      suburb: '',
      preferred_day: '',
      preferred_time: '',
      issue_type: '',
      urgency: '',
      property_type: '',
      issue_description: '',
    },
  });

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const selected = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-selecting the same file after removal

    const accepted: File[] = [];
    for (const file of selected) {
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        setPhotoError(`"${file.name}" is not a supported image (JPEG, PNG, or WebP only).`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`"${file.name}" is larger than 10MB.`);
        continue;
      }
      accepted.push(file);
    }

    setPhotos((current) => {
      const combined = [...current, ...accepted];
      if (combined.length > MAX_PHOTOS) {
        setPhotoError(`You can attach up to ${MAX_PHOTOS} photos.`);
        return combined.slice(0, MAX_PHOTOS);
      }
      return combined;
    });
  }

  function removePhoto(index: number) {
    setPhotoError(null);
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  async function onSubmit(values: RequestInspectionSchemaType) {
    try {
      let photoPaths: string[] = [];
      if (photos.length > 0) {
        const { paths, failed } = await uploadLeadPhotos(photos);
        photoPaths = paths;
        if (failed.length > 0) {
          // Non-blocking: the enquiry still goes through without the failed photos.
          toast.warning(
            `${failed.length} photo${failed.length > 1 ? 's' : ''} couldn't be uploaded — your enquiry was still sent.`,
          );
        }
      }

      await submitPublicLead(values, photoPaths);
      navigate('/request-inspection/success');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please call us at 1800 954 117.';
      toast.error(message);
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#121D73]">Book Your Free Inspection</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mould &amp; Restoration Co. — tell us about your property and we'll be in touch.
          </p>
        </header>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input className="h-12" autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input
                        className="h-12"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="04XX XXX XXX"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input
                        className="h-12"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Address<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input className="h-12" autoComplete="street-address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Day<RequiredMark /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose a day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PREFERRED_DAYS.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time<RequiredMark /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose a time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PREFERRED_TIMES.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issue_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Issue<RequiredMark /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose the type of issue" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ISSUE_TYPES.map((issue) => (
                          <SelectItem key={issue} value={issue}>{issue}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How Urgent Is This?<RequiredMark /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose urgency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {URGENCY_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type<RequiredMark /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issue_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Message</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Briefly describe the issue — which rooms are affected, how long has it been there, any known water damage or leaks?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label
                  htmlFor="lead-photos"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Attach Photos (optional)
                </label>
                <Input
                  id="lead-photos"
                  type="file"
                  accept={ACCEPTED_PHOTO_TYPES.join(',')}
                  multiple
                  className="h-12 cursor-pointer file:mr-3 file:cursor-pointer"
                  onChange={handlePhotoSelect}
                  disabled={photos.length >= MAX_PHOTOS}
                />
                <p className="text-xs text-muted-foreground">
                  Up to {MAX_PHOTOS} images, max 10MB each (JPEG, PNG, or WebP).
                </p>
                {photoError && <p className="text-xs text-red-600">{photoError}</p>}
                {photos.length > 0 && (
                  <ul className="space-y-1">
                    {photos.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          aria-label={`Remove ${file.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button type="submit" className="h-12 w-full text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Book My Free Inspection'
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Your details are only used to contact you regarding your enquiry.
              </p>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
};

export default RequestInspection;
