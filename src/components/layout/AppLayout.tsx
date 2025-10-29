import { Outlet } from "react-router-dom";
import { TopNavbar } from "./TopNavbar";
import { BottomNavbar } from "./BottomNavbar";

export function AppLayout() {
  return (
    <div className="app-layout min-h-screen w-full overflow-x-hidden bg-background">
      <TopNavbar />
      
      <main className="main-content pt-16 pb-0 md:pb-0">
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>
      
      <BottomNavbar />
    </div>
  );
}
