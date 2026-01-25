export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          New Login Coming Soon
        </h1>
        <a
          href="/old-login"
          className="text-primary hover:underline"
        >
          Use current login →
        </a>
      </div>
    </div>
  );
}
