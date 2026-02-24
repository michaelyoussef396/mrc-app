import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Users,
  ChevronRight,
  Trash2,
  LogOut,
  Key,
  Loader2,
  Smartphone,
  Lock,
  HelpCircle
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import TechnicianBottomNav from '@/components/technician/TechnicianBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { forceLogoutAllDevices, signOut, currentRole } = useAuth();
  const isDeveloper = currentRole === 'developer';
  const isTechnician = currentRole === 'technician';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;

    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to sign out. Please try again.',
        });
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    const confirmed = window.confirm(
      'This will log you out from ALL devices including this one. You will need to sign in again. Continue?'
    );

    if (!confirmed) return;

    setIsLoggingOutAll(true);
    try {
      // Pass false = don't except current session (log out everyone)
      await forceLogoutAllDevices(false);

      // The signOut in forceLogoutAllDevices should redirect to /
      // But just in case, also call signOut explicitly
      await signOut();

    } catch (error) {
      console.error('Force logout failed:', error);
      // Even if there's an error, sign out the current user
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: This will permanently delete your account and all data. This cannot be undone!')) {
      return;
    }

    const confirmation = prompt('Type DELETE to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      toast({
        title: 'Cancelled',
        description: 'Account deletion cancelled.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No user logged in.',
        });
        return;
      }

      // Call Edge Function to delete user using DELETE method
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?userId=${user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Sign out after deletion
      await supabase.auth.signOut();

      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });

      navigate('/');
    } catch (error) {
      console.error('Delete account error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete account. Please contact support.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">

      {/* Header - 48px touch target for back button */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <button
          className="w-12 h-12 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200 hover:text-gray-900"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 m-0">Settings</h1>
        <div className="w-12"></div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-6">

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Account</h2>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">

            <button
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => navigate(isTechnician ? '/technician/profile' : '/profile')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <User size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">My Profile</h3>
                  <p className="text-sm text-gray-600 m-0">View and edit your profile information</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => navigate('/forgot-password')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-600 flex items-center justify-center flex-shrink-0">
                  <Key size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Change Password</h3>
                  <p className="text-sm text-gray-600 m-0">Update your password for security</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* User Management Section - Admin/Developer only */}
        {!isTechnician && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">User Management</h2>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">

            <button
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => navigate('/manage-users')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Users size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Manage Users</h3>
                  <p className="text-sm text-gray-600 m-0">Add or remove technicians and admins</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>
        )}

        {/* Support Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Support</h2>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">

            <button
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => navigate(isTechnician ? '/technician/help' : '/help')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Help & Support</h3>
                  <p className="text-sm text-gray-600 m-0">Contact developer for assistance</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-8 border-t-2 border-red-100 pt-6">
          <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3 ml-1">Danger Zone</h2>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">

            <button
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-red-50 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  {isSigningOut ? (
                    <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <LogOut size={20} strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-red-600 mb-1">
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </h3>
                  <p className="text-sm text-gray-600 m-0">Log out of your account</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            {isDeveloper ? (
              <button
                className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-orange-50 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleLogoutAllDevices}
                disabled={isLoggingOutAll}
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
                    {isLoggingOutAll ? (
                      <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                    ) : (
                      <Smartphone size={20} strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-orange-600 mb-1">
                      {isLoggingOutAll ? 'Logging out...' : 'Log out from ALL devices'}
                    </h3>
                    <p className="text-sm text-gray-500 m-0">Log out from ALL devices including this one. You will need to sign in again.</p>
                  </div>
                </div>
                <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={20} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-gray-400 mb-1">Log out from ALL devices</h3>
                    <p className="text-sm text-gray-500 m-0 flex items-center gap-1.5">
                      <Lock size={14} strokeWidth={2} />
                      Developer only - Contact admin for assistance
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-red-50 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  {isDeleting ? (
                    <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Trash2 size={20} strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-red-600 mb-1">
                    {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                  </h3>
                  <p className="text-sm text-gray-600 m-0">Permanently delete your account</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 mb-2">
            Made with care in Melbourne, Australia
          </p>
          <p className="text-xs text-gray-500 m-0">
            {new Date().getFullYear()} Mould & Restoration Co. All rights reserved.
          </p>
        </div>

      </div>

      {/* Mobile Bottom Navigation - Role-aware */}
      {isTechnician ? <TechnicianBottomNav /> : <MobileBottomNav />}
    </div>
  );
}
