import { useNavigate, useParams } from 'react-router-dom';
import { XCircle, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportApprovalFailed() {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleRetry = () => {
    // In production, this would trigger the approval process again
    if (id) {
      navigate(`/lead/new/${id}`);
    } else {
      navigate('/leads');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl shadow-2xl mb-6 animate-pulse-slow">
            <XCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Approval Failed
          </h1>
          
          <p className="text-lg text-gray-600">
            We couldn't approve or send the inspection report. Please try again.
          </p>
        </div>

        {/* Error Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-red-100">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">What went wrong?</h3>
                <p className="text-sm text-gray-600">
                  The system encountered an error while processing your approval request.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <h4 className="font-medium text-red-900 text-sm mb-2">Possible reasons:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Network connection issue</li>
                <li>• PDF file not found or corrupted</li>
                <li>• Email delivery service unavailable</li>
                <li>• Invalid client email address</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full h-14 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg"
          >
            <RefreshCw className="mr-2 w-5 h-5" />
            Try Again
          </Button>

          <Button
            onClick={() => id ? navigate(`/lead/new/${id}`) : navigate('/leads')}
            variant="outline"
            className="w-full h-14 border-2 border-gray-200 hover:bg-gray-50 font-semibold rounded-xl"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Lead
          </Button>

          <Button
            onClick={() => navigate('/leads')}
            variant="ghost"
            className="w-full h-12 hover:bg-gray-100 font-medium rounded-xl"
          >
            View All Leads
          </Button>
        </div>

        {/* Help text */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
          <p className="text-sm text-amber-800">
            <strong>Need help?</strong> If this error persists, please contact support or check your internet connection.
          </p>
        </div>
      </div>
    </div>
  );
}
