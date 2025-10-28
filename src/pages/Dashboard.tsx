import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/Logo.png";

export default function Dashboard() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between text-primary-foreground">
          <img 
            src={logo} 
            alt="Mould & Restoration Co." 
            className="h-10 sm:h-12"
          />
          <Button onClick={signOut} variant="outline" size="sm" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow p-6 sm:p-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Dashboard
          </h2>
          <p className="text-muted-foreground mb-6">
            Welcome, {user?.email}
          </p>
          <p className="text-lg text-foreground">
            More features coming soon...
          </p>
        </div>
      </main>
    </div>
  );
}
