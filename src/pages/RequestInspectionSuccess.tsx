import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

const RequestInspectionSuccess = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-8">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-[#121D73]">Thank You for Your Enquiry</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We've received your request and a member of the Mould &amp; Restoration Co. team
          will call you shortly to confirm your inspection.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Need us sooner? Call{' '}
          <a href="tel:1800954117" className="font-semibold text-[#121D73]">
            1800&nbsp;954&nbsp;117
          </a>
          .
        </p>
        <Button asChild variant="outline" className="mt-6 h-12 w-full">
          <Link to="/request-inspection">Submit another enquiry</Link>
        </Button>
      </div>
    </main>
  );
};

export default RequestInspectionSuccess;
