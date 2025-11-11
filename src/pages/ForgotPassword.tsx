import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Mail } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Lock Icon */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 shadow-lg">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Password Reset</h2>
          <p className="mt-2 text-lg text-orange-600 font-semibold">Coming Soon</p>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-gray-700">
              Password reset functionality is currently under development. We're working to bring this feature to you soon!
            </p>
          </div>

          {/* Contact Developer */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-2">Need to reset your password?</p>
            <p className="text-sm text-gray-700 mb-3">Please contact the developer:</p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-500" />
              <a
                href="mailto:michaelyoussef396@gmail.com"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                michaelyoussef396@gmail.com
              </a>
            </div>
          </div>

          {/* Admin Workaround */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Admin Note:</strong> Admins can manually reset user passwords through the Supabase dashboard until this feature is ready.
            </p>
          </div>
        </div>

        {/* Back to Login Button */}
        <div className="mt-6">
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
