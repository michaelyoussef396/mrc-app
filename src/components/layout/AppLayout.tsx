import { Outlet } from "react-router-dom";
import { BottomNavbar } from "./BottomNavbar";

export function AppLayout() {
  return (
    <div className="app-layout min-h-screen w-full overflow-x-hidden bg-background">
      <main className="main-content">
        <div className="pb-24 md:pb-0">
          <Outlet />
        </div>
      </main>
      
      <BottomNavbar />
    </div>
  );
}
