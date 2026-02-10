import { Link } from "react-router-dom";
import { Home, Users, Calendar, Microscope, FileText } from "lucide-react";

export function MobileBottomNav() {
  const tabs = [
    { label: "Home", icon: Home, path: "/dashboard" },
    { label: "Leads", icon: Users, path: "/leads" },
    { label: "Calendar", icon: Calendar, path: "/calendar" },
    { label: "Inspections", icon: Microscope, path: "/inspection/select-lead" },
    { label: "Reports", icon: FileText, path: "/reports" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.path === "/dashboard";
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Also export as default for compatibility
export default MobileBottomNav;
