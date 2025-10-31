import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileCheck, Send, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportApproved() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    // Optional: Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      if (id) {
        navigate(`/lead/new/${id}`);
      } else {
        navigate('/leads');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-2xl mb-6 animate-bounce-slow">
            <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Report Approved!
          </h1>
          
          <p className="text-lg text-gray-600">
            The inspection report has been successfully approved and sent to the client.
          </p>
        </div>

        {/* Success Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Report Approved</h3>
                <p className="text-sm text-gray-600">
                  The PDF report has been reviewed and approved for delivery
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Email Sent</h3>
                <p className="text-sm text-gray-600">
                  The report has been automatically emailed to the client
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => id ? navigate(`/lead/new/${id}`) : navigate('/leads')}
            className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg"
          >
            View Lead Details
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>

          <Button
            onClick={() => navigate('/leads')}
            variant="outline"
            className="w-full h-14 border-2 border-gray-200 hover:bg-gray-50 font-semibold rounded-xl"
          >
            Back to All Leads
          </Button>
        </div>

        {/* Auto-redirect notice */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Redirecting automatically in 5 seconds...
        </p>
      </div>
    </div>
  );
}
