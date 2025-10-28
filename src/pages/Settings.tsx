import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import CompanyProfile from "@/components/settings/CompanyProfile";
import OperatingHours from "@/components/settings/OperatingHours";
import PricingDefaults from "@/components/settings/PricingDefaults";
import EquipmentMaterials from "@/components/settings/EquipmentMaterials";
import Notifications from "@/components/settings/Notifications";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("company");

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your system preferences and business details
            </p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 h-auto gap-1">
            <TabsTrigger value="company" className="text-xs px-2 py-2">
              Company
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-xs px-2 py-2">
              Hours
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs px-2 py-2">
              Pricing
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs px-2 py-2">
              Equipment
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs px-2 py-2">
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanyProfile />
          </TabsContent>

          <TabsContent value="hours">
            <OperatingHours />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingDefaults />
          </TabsContent>

          <TabsContent value="equipment">
            <EquipmentMaterials />
          </TabsContent>

          <TabsContent value="notifications">
            <Notifications />
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Settings;
