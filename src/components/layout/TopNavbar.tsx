import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, ClipboardList, Calendar, FileText, BarChart3, User, Settings, Users, LogOut, ChevronDown, Menu } from "lucide-react";
import logoMRC from "@/assets/logoMRC.png";

export function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/leads', label: 'Leads', icon: ClipboardList },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/inspection', label: 'Inspections', icon: FileText },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Mobile Hamburger Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <img src={logoMRC} alt="MRC" className="h-8 w-auto" />
                <span className="text-lg font-bold text-primary">MRC</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.path}
                    variant={isActive(link.path) ? "default" : "ghost"}
                    className="justify-start gap-3 h-12"
                    onClick={() => handleNavigation(link.path)}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Button>
                );
              })}
              <div className="border-t border-border my-4" />
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12"
                onClick={() => handleNavigation('/profile')}
              >
                <User className="h-5 w-5" />
                Profile
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12"
                onClick={() => handleNavigation('/settings')}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12"
                onClick={() => handleNavigation('/manage-users')}
              >
                <Users className="h-5 w-5" />
                Manage Users
              </Button>
              <div className="border-t border-border my-4" />
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo and Brand */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src={logoMRC} alt="MRC" className="h-9 w-auto" />
          <span className="hidden sm:block text-xl font-bold text-primary">MRC</span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.path}
                variant={isActive(link.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(link.path)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Button>
            );
          })}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline max-w-[150px] truncate">
                {user?.email}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/manage-users')}>
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
