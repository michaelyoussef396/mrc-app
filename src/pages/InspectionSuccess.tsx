import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, Mail, Home, Clock } from "lucide-react";

export default function InspectionSuccess() {
  const [searchParams] = useSearchParams();
  const leadNumber = searchParams.get("ref") || "MRC-2025-XXXX";
  const email = searchParams.get("email") || "";
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <img
              src="/placeholder.svg"
              alt="MRC Logo"
              className="h-12"
            />
          </div>
        </div>
      </header>

      {/* Success Content */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-card border rounded-lg shadow-lg p-8 md:p-12 text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>

          {/* Thank You Message */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">
              Thank You For Your Inquiry!
            </h1>
            <p className="text-lg text-muted-foreground">
              We've received your mould inspection request and will contact you within 24 hours.
            </p>
          </div>

          {/* Reference Number */}
          <div className="bg-muted rounded-lg p-6 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Reference Number
            </p>
            <p className="text-2xl font-bold text-primary">
              {leadNumber}
            </p>
          </div>

          {/* Confirmation Email */}
          {email && (
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to:{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          )}

          {/* What Happens Next */}
          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold mb-6">What Happens Next?</h2>
            <div className="grid gap-4 text-left">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">We'll call you within 24 hours</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team will reach out to discuss your needs
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Schedule your free inspection</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll find a convenient time that works for you
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Expert visits your property</h3>
                  <p className="text-sm text-muted-foreground">
                    Licensed technician performs thorough inspection
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Receive detailed report</h3>
                  <p className="text-sm text-muted-foreground">
                    Professional analysis with photos and findings
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold">Get no-obligation quote</h3>
                  <p className="text-sm text-muted-foreground">
                    Clear pricing with multiple treatment options
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  6
                </div>
                <div>
                  <h3 className="font-semibold">We fix your mould problem!</h3>
                  <p className="text-sm text-muted-foreground">
                    Professional remediation with 12-month warranty
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Need Immediate Help */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-bold mb-4">Need Immediate Help?</h2>
            <p className="text-muted-foreground mb-6">
              For urgent issues, call us now:
            </p>
            <div className="space-y-4">
              <Button size="lg" className="w-full" asChild>
                <a href="tel:1300665673">
                  <Phone className="mr-2 h-5 w-5" />
                  Call 1300 665 673
                </a>
              </Button>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <a href="mailto:info@mrc.com.au">
                  <Mail className="mr-2 h-5 w-5" />
                  Email Us
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <Clock className="inline h-4 w-4 mr-1" />
              Emergency service available Mon-Sat 7am-7pm
            </p>
          </div>

          {/* Return Home */}
          <div className="border-t pt-8">
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting in {countdown} seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
