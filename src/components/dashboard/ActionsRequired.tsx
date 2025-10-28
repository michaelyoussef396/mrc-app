import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, FileText } from "lucide-react";

export function ActionsRequired() {
  const actions = [
    {
      icon: AlertCircle,
      iconColor: "text-red-600",
      title: "3 leads need follow-up",
      subtext: "(Contacted 2+ days ago)",
      buttonText: "Review Now",
    },
    {
      icon: DollarSign,
      iconColor: "text-amber-600",
      title: "2 quotes awaiting response",
      subtext: "Total: $8,800",
      buttonText: "Follow Up",
    },
    {
      icon: FileText,
      iconColor: "text-blue-600",
      title: "1 report pending delivery",
      subtext: "MRC-2025-0042",
      buttonText: "Send Now",
    },
  ];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-foreground">⚡ Actions Required</h2>
        <Badge variant="destructive" className="rounded-full">
          3
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <Icon className={`h-6 w-6 mt-1 ${action.iconColor}`} />
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    {action.title}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {action.subtext}
                  </p>
                  <Button size="sm" className="w-full">
                    {action.buttonText}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
