import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  formatPhoneNumber,
  cleanPhoneNumber,
  calculatePropertyZone,
  leadSourceOptions,
  propertyTypeOptions,
  urgencyOptions,
  stateOptions,
} from "@/lib/leadUtils";

const formSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  property_address_street: z.string().optional(),
  property_address_suburb: z.string().optional(),
  property_address_state: z.string().default("VIC"),
  property_address_postcode: z.string().optional(),
  property_type: z.string().optional(),
  lead_source: z.string().optional(),
  issue_description: z.string().max(1000).optional(),
  urgency: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      property_address_street: "",
      property_address_suburb: "",
      property_address_state: "VIC",
      property_address_postcode: "",
      property_type: "",
      lead_source: "",
      issue_description: "",
      urgency: "",
      assigned_to: null,
    },
  });

  // Load technicians when dialog opens (from Edge Function - all users shown)
  useEffect(() => {
    const loadTechnicians = async () => {
      if (!open) return;

      console.log('🔍 Loading technicians from Edge Function...');

      try {
        // Get session for authorization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('No session found, cannot fetch users');
          setTechnicians([]);
          return;
        }

        // Fetch all users from Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const { users } = await response.json();

        // Map users to technician format (show ALL users as per user decision)
        const technicianList = users?.map((user: { id: string; full_name: string }) => ({
          id: user.id,
          full_name: user.full_name || 'Unknown',
        })) || [];

        // Sort by name
        technicianList.sort((a: { full_name: string }, b: { full_name: string }) =>
          a.full_name.localeCompare(b.full_name)
        );

        console.log('✅ Technicians data:', technicianList);
        setTechnicians(technicianList);
        console.log(`✅ Loaded ${technicianList.length} technicians`);
      } catch (error) {
        console.error("Error loading technicians:", error);
        toast({
          title: "Warning",
          description: "Failed to load technicians",
          variant: "destructive",
        });
        setTechnicians([]);
      }
    };

    loadTechnicians();
  }, [open, toast]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate lead number
      const { data: leadNumberData } = await supabase.rpc('generate_lead_number');
      const leadNumber = leadNumberData as string;

      // Calculate property zone
      const propertyZone = calculatePropertyZone(values.property_address_suburb);

      // Clean phone number
      const cleanedPhone = cleanPhoneNumber(values.phone);

      // Insert lead
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          lead_number: leadNumber,
          status: "new_lead",
          full_name: values.full_name,
          email: values.email,
          phone: cleanedPhone,
          property_address_street: values.property_address_street,
          property_address_suburb: values.property_address_suburb,
          property_address_state: values.property_address_state,
          property_address_postcode: values.property_address_postcode,
          property_zone: propertyZone,
          property_type: values.property_type || null,
          lead_source: values.lead_source,
          issue_description: values.issue_description || null,
          urgency: values.urgency || null,
          assigned_to: null, // Always null - technician assignment handled separately
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Create activity log
      await supabase.from("activities").insert({
        lead_id: lead.id,
        activity_type: "lead_created",
        title: "Lead Created",
        description: `New lead added to system by ${user.email}`,
        user_id: user.id,
      });

      toast({
        title: "Success",
        description: `✅ Lead created successfully! Lead #: ${leadNumber}`,
      });

      queryClient.invalidateQueries({ queryKey: ["leads"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle phone number formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setValue("phone", formatted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* CUSTOMER INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Customer Information</h3>
              
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Smith" {...field} />
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
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., john.smith@email.com" {...field} />
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
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="e.g., 0412 345 678"
                        {...field}
                        onChange={handlePhoneChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PROPERTY INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Property Information</h3>

              <FormField
                control={form.control}
                name="property_address_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 45 High Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="property_address_suburb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suburb *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Croydon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="property_address_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stateOptions.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="property_address_postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 3136" maxLength={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* LEAD DETAILS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Lead Details</h3>

              <FormField
                control={form.control}
                name="lead_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did they hear about us? *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead source..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leadSourceOptions.map((source, index) => (
                          <SelectItem
                            key={index}
                            value={source.value}
                            disabled={source.disabled}
                          >
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      💡 Required - tracks marketing effectiveness
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issue_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the mould issue, affected areas, visible symptoms, etc."
                        className="min-h-[120px]"
                        maxLength={1000}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      {field.value?.length || 0}/1000 characters
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {urgencyOptions.map((urgency) => (
                          <SelectItem key={urgency.value} value={urgency.value}>
                            {urgency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ASSIGNMENT - Optional for now */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Assignment <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
              </h3>

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Technician (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned - will be assigned later" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Technician assignment will be handled separately
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Lead
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
