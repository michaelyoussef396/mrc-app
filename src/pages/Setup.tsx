import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoMRC from "@/assets/logoMRC.png";
import { X, ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";

// Step 1 schema
const step1Schema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  abn: z.string().optional(),
  businessPhone: z.string().min(10, "Valid phone number required"),
  businessEmail: z.string().email("Valid email required"),
  streetAddress: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().default("VIC"),
  postcode: z.string().optional(),
});

type Step1Form = z.infer<typeof step1Schema>;

// Step 3 team member type
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Setup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1 form
  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      businessName: "Mould & Restoration Co.",
      abn: "",
      businessPhone: "1300 665 673",
      businessEmail: "info@mrc.com.au",
      streetAddress: "",
      suburb: "Melbourne",
      state: "VIC",
      postcode: "3000",
    },
  });

  // Step 2 operating hours state
  const [operatingHours, setOperatingHours] = useState([
    { day: 0, name: "Monday", isOpen: true, openTime: "07:00", closeTime: "19:00" },
    { day: 1, name: "Tuesday", isOpen: true, openTime: "07:00", closeTime: "19:00" },
    { day: 2, name: "Wednesday", isOpen: true, openTime: "07:00", closeTime: "19:00" },
    { day: 3, name: "Thursday", isOpen: true, openTime: "07:00", closeTime: "19:00" },
    { day: 4, name: "Friday", isOpen: true, openTime: "07:00", closeTime: "19:00" },
    { day: 5, name: "Saturday", isOpen: true, openTime: "07:00", closeTime: "19:00" },
    { day: 6, name: "Sunday", isOpen: false, openTime: "07:00", closeTime: "19:00" },
  ]);

  // Step 3 team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: "1", name: "", email: "", role: "Technician" },
  ]);

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await step1Form.trigger();
      if (isValid) {
        setCurrentStep(2);
      }
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete setup
      await handleCompleteSetup();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleApplySameHours = () => {
    const mondayHours = operatingHours[0];
    setOperatingHours(operatingHours.map(day => ({
      ...day,
      openTime: mondayHours.openTime,
      closeTime: mondayHours.closeTime,
      isOpen: mondayHours.isOpen,
    })));
  };

  const handleAddTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { id: Date.now().toString(), name: "", email: "", role: "Technician" },
    ]);
  };

  const handleRemoveTeamMember = (id: string) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter(member => member.id !== id));
    }
  };

  const handleCompleteSetup = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Save company settings
      const step1Data = step1Form.getValues();
      await supabase.from("company_settings").upsert({
        user_id: user.id,
        business_name: step1Data.businessName,
        abn: step1Data.abn,
        business_phone: step1Data.businessPhone,
        business_email: step1Data.businessEmail,
        street_address: step1Data.streetAddress,
        suburb: step1Data.suburb,
        state: step1Data.state,
        postcode: step1Data.postcode,
      });

      // Save operating hours
      for (const hours of operatingHours) {
        await supabase.from("operating_hours").upsert({
          user_id: user.id,
          day_of_week: hours.day,
          is_open: hours.isOpen,
          open_time: hours.openTime,
          close_time: hours.closeTime,
        });
      }

      // Mark onboarding as in progress
      await supabase.from("profiles").update({
        onboarding_step: "tour",
      }).eq("id", user.id);

      toast({
        title: "Setup Complete!",
        description: "Your company settings have been saved.",
      });

      navigate("/tour");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <img src={logoMRC} alt="MRC" className="h-12" />
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Skip Setup
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">SETUP PROGRESS:</span>
            <span className="text-sm text-muted-foreground">Step {currentStep} of 4</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-card rounded-xl shadow-lg p-6 sm:p-8">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Tell Us About Your Business
                </h2>
                <p className="text-muted-foreground">
                  This helps us personalize your experience
                </p>
              </div>

              <Form {...step1Form}>
                <form className="space-y-4">
                  <FormField
                    control={step1Form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Mould & Restoration Co." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="abn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ABN (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12 345 678 901" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={step1Form.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1300 665 673" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="businessEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Email *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="info@mrc.com.au" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-foreground mb-4">Business Address</h3>
                    
                    <div className="space-y-4">
                      <FormField
                        control={step1Form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123 Business St" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <FormField
                          control={step1Form.control}
                          name="suburb"
                          render={({ field }) => (
                            <FormItem className="col-span-2 sm:col-span-1">
                              <FormLabel>Suburb</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Melbourne" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={step1Form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="VIC">VIC</SelectItem>
                                  <SelectItem value="NSW">NSW</SelectItem>
                                  <SelectItem value="QLD">QLD</SelectItem>
                                  <SelectItem value="SA">SA</SelectItem>
                                  <SelectItem value="WA">WA</SelectItem>
                                  <SelectItem value="TAS">TAS</SelectItem>
                                  <SelectItem value="NT">NT</SelectItem>
                                  <SelectItem value="ACT">ACT</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={step1Form.control}
                          name="postcode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postcode</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="3000" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {/* Step 2: Operating Hours */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  When Do You Operate?
                </h2>
                <p className="text-muted-foreground">
                  Set your standard business hours
                </p>
              </div>

              <div className="space-y-3">
                {operatingHours.map((hours, index) => (
                  <div key={hours.day} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="w-24 font-medium text-foreground">{hours.name}:</div>
                    
                    <div className="flex-1 flex items-center gap-2">
                      {hours.isOpen ? (
                        <>
                          <Input
                            type="time"
                            value={hours.openTime}
                            onChange={(e) => {
                              const newHours = [...operatingHours];
                              newHours[index].openTime = e.target.value;
                              setOperatingHours(newHours);
                            }}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={hours.closeTime}
                            onChange={(e) => {
                              const newHours = [...operatingHours];
                              newHours[index].closeTime = e.target.value;
                              setOperatingHours(newHours);
                            }}
                            className="w-32"
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">Closed</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={hours.isOpen}
                        onCheckedChange={(checked) => {
                          const newHours = [...operatingHours];
                          newHours[index].isOpen = checked as boolean;
                          setOperatingHours(newHours);
                        }}
                        id={`open-${hours.day}`}
                      />
                      <label htmlFor={`open-${hours.day}`} className="text-sm cursor-pointer">
                        Open
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleApplySameHours}
                variant="outline"
                className="w-full"
              >
                Apply Same Hours to All Days
              </Button>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 These hours help with scheduling and client booking availability
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Team Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Add Your Team Members
                </h2>
                <p className="text-muted-foreground">
                  Invite technicians to the system
                </p>
              </div>

              <div className="space-y-4">
                {teamMembers.map((member, index) => (
                  <div key={member.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">Team Member {index + 1}</h3>
                      {teamMembers.length > 1 && (
                        <Button
                          onClick={() => handleRemoveTeamMember(member.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => {
                        const newMembers = [...teamMembers];
                        newMembers[index].name = e.target.value;
                        setTeamMembers(newMembers);
                      }}
                    />

                    <Input
                      type="email"
                      placeholder="Email"
                      value={member.email}
                      onChange={(e) => {
                        const newMembers = [...teamMembers];
                        newMembers[index].email = e.target.value;
                        setTeamMembers(newMembers);
                      }}
                    />

                    <Select
                      value={member.role}
                      onValueChange={(value) => {
                        const newMembers = [...teamMembers];
                        newMembers[index].role = value;
                        setTeamMembers(newMembers);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technician">Technician</SelectItem>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleAddTeamMember}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Team Member
              </Button>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 Don't worry, you can add more team members later from Settings
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Pricing Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Review Your Pricing
                </h2>
                <p className="text-muted-foreground">
                  We've pre-configured standard MRC rates
                </p>
              </div>

              <div className="space-y-6">
                {/* Job Type Rates */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-4">JOB TYPE RATES (ex GST):</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">No Demolition (Surface)</span>
                      <span className="text-muted-foreground">2h: $612.00 | 8h: $1,216.99</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Demo</span>
                      <span className="text-muted-foreground">2h: $711.90 | 8h: $1,798.90</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Construction</span>
                      <span className="text-muted-foreground">2h: $661.96 | 8h: $1,507.95</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium">Subfloor</span>
                      <span className="text-muted-foreground">2h: $900.00 | 8h: $2,334.69</span>
                    </div>
                  </div>
                </div>

                {/* Equipment Hire */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-4">EQUIPMENT HIRE (per day, ex GST):</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>• Dehumidifier:</span>
                      <span className="font-medium">$132</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>• Air Mover/Blower:</span>
                      <span className="font-medium">$46</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>• RCD:</span>
                      <span className="font-medium">$5</span>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="standard-pricing" defaultChecked />
                    <label htmlFor="standard-pricing" className="text-sm cursor-pointer">
                      Use standard MRC pricing
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="customize-later" />
                    <label htmlFor="customize-later" className="text-sm cursor-pointer">
                      I'll customize pricing later
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    💡 You can adjust all pricing in Settings
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t mt-8">
            {currentStep > 1 ? (
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <Button onClick={handleSkip} variant="ghost">
                Skip
              </Button>
              <Button onClick={handleNext} disabled={isLoading}>
                {isLoading ? (
                  "Saving..."
                ) : currentStep === 4 ? (
                  "COMPLETE SETUP"
                ) : (
                  <>
                    Next Step
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
