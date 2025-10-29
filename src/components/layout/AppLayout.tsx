import { Outlet } from "react-router-dom";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import { BottomNavbar } from "./BottomNavbar";

export function AppLayout() {
  return (
    <div className="app-layout min-h-screen w-full overflow-x-hidden bg-background">
      <TopNavigation />
      
      <main className="main-content">
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>
      
      <BottomNavbar />
    </div>
  );
}
