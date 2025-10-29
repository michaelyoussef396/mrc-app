import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ActionsRequired } from "@/components/dashboard/ActionsRequired";
import { TodaysSchedule } from "@/components/dashboard/TodaysSchedule";
import { RevenueOverview } from "@/components/dashboard/RevenueOverview";
import { LeadPipeline } from "@/components/dashboard/LeadPipeline";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { WebLeadsWidget } from "@/components/dashboard/WebLeadsWidget";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";

export default function Dashboard() {
  const [showAddLead, setShowAddLead] = useState(false);
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Page Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setShowAddLead(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Add New Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Actions Required */}
        <ActionsRequired />

        {/* Website Leads Widget and Today's Schedule */}
        <div className="grid gap-8 lg:grid-cols-2">
          <WebLeadsWidget />
          <TodaysSchedule />
        </div>

        {/* Recent Activity */}
        <RecentActivity />

        {/* Revenue Overview */}
        <RevenueOverview />

        {/* Lead Pipeline */}
        <LeadPipeline />
      </main>

      {/* Add Lead Dialog */}
      <AddLeadDialog open={showAddLead} onOpenChange={setShowAddLead} />
    </div>
  );
}
