import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Star, Check } from "lucide-react";
import { formatPhoneNumber, cleanPhoneNumber, calculatePropertyZone } from "@/lib/leadUtils";

const formSchema = z.object({
  full_name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  best_time_to_call: z.string().optional(),
  property_address_street: z.string().min(1, "Please enter your property address"),
  property_address_suburb: z.string().min(1, "Please enter suburb"),
  property_address_postcode: z.string().regex(/^\d{4}$/, "Please enter a valid 4-digit postcode"),
  property_type: z.string().optional(),
  issue_description: z.string().min(10, "Please describe where you see mould"),
  urgency: z.string().default("medium"),
  marketing_source: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, "You must agree to be contacted"),
});

type FormValues = z.infer<typeof formSchema>;

export default function RequestInspection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      best_time_to_call: "anytime",
      property_address_street: "",
      property_address_suburb: "",
      property_address_postcode: "",
      property_type: "",
      issue_description: "",
      urgency: "medium",
      marketing_source: "",
      consent: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Generate lead number
      const { data: leadNumberData } = await supabase.rpc('generate_lead_number');
      const leadNumber = leadNumberData as string;

      // Calculate property zone
      const propertyZone = calculatePropertyZone(values.property_address_suburb);

      // Clean phone number
      const cleanedPhone = cleanPhoneNumber(values.phone);

      // Create notes field with additional info
      const notes = [
        values.best_time_to_call && `Best time to call: ${values.best_time_to_call}`,
        values.marketing_source && `Additional source info: ${values.marketing_source}`,
      ].filter(Boolean).join('\n');

      // Insert lead with lead_source automatically set to "Website Form"
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
          property_address_state: "VIC",
          property_address_postcode: values.property_address_postcode,
          property_zone: propertyZone,
          property_type: values.property_type || null,
          lead_source: "Website Form", // AUTOMATIC!
          issue_description: values.issue_description,
          urgency: values.urgency,
          notes: notes || null,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Create activity log
      await supabase.from("activities").insert({
        lead_id: lead.id,
        activity_type: "lead_created",
        title: "Web Lead Received",
        description: "New inquiry submitted via website form",
      });

      // Navigate to success page with lead number
      navigate(`/request-inspection/success?ref=${leadNumber}&email=${values.email}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setValue("phone", formatted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <img
              src="/placeholder.svg"
              alt="MRC Logo"
              className="h-12"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold">
            Get Your Free Mould Inspection Quote
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-lg">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span>5.0 Rating • 150+ Happy Customers</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm md:text-base">
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              <span>Fast Response</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              <span>Licensed & Insured</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              <span>No-Obligation Quote</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              <span>Same-Day Service</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-card border rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-6">Request Your Free Inspection</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* YOUR DETAILS */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Your Details</h3>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
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
                        <Input type="email" placeholder="john.smith@email.com" {...field} />
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
                          placeholder="0412 345 678"
                          {...field}
                          onChange={handlePhoneChange}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">We'll call you to schedule</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="best_time_to_call"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Best Time to Call</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning (8am-12pm)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                          <SelectItem value="evening">Evening (5pm-7pm)</SelectItem>
                          <SelectItem value="anytime">Anytime</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <FormLabel>Property Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="45 High Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="property_address_suburb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suburb *</FormLabel>
                        <FormControl>
                          <Input placeholder="Croydon" {...field} />
                        </FormControl>
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
                          <Input placeholder="3136" maxLength={4} {...field} />
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
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="residential_house">Residential House</SelectItem>
                          <SelectItem value="residential_apartment">Residential Apartment</SelectItem>
                          <SelectItem value="commercial">Commercial Property</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* TELL US ABOUT THE ISSUE */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Tell Us About the Issue</h3>

                <FormField
                  control={form.control}
                  name="issue_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where do you see mould? *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Bathroom ceiling, bedroom walls..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>How urgent is this?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="low" id="low" />
                            <label htmlFor="low" className="cursor-pointer">
                              Not urgent (can wait weeks)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <label htmlFor="medium" className="cursor-pointer">
                              Somewhat urgent (within days)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="high" />
                            <label htmlFor="high" className="cursor-pointer">
                              Very urgent (ASAP)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="emergency" id="emergency" />
                            <label htmlFor="emergency" className="cursor-pointer">
                              Emergency (same day if possible)
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marketing_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us? (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="google_search">Google Search</SelectItem>
                          <SelectItem value="facebook">Facebook/Social Media</SelectItem>
                          <SelectItem value="referral">Friend/Family Referral</SelectItem>
                          <SelectItem value="google_ads">Google Ads</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* CONSENT */}
              <FormField
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-t pt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to be contacted about my inquiry *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Get My Free Quote
              </Button>
            </form>
          </Form>

          {/* Contact Info */}
          <div className="mt-8 pt-8 border-t text-center space-y-2 text-sm text-muted-foreground">
            <p>📞 Or call us now: <strong>1300 665 673</strong></p>
            <p>📧 Email: info@mrc.com.au</p>
            <p>🕐 Mon-Sat 7am-7pm</p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm">
          <div className="flex flex-col items-center gap-2">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            <span>5.0 Google Rating<br />150+ Reviews</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check className="h-6 w-6 text-green-500" />
            <span>Licensed<br />& Insured</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check className="h-6 w-6 text-green-500" />
            <span>24-Hour<br />Response Time</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check className="h-6 w-6 text-green-500" />
            <span>Free, No-Obligation<br />Quotes</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check className="h-6 w-6 text-green-500" />
            <span>10+ Years<br />Experience</span>
          </div>
        </div>
      </div>
    </div>
  );
}
