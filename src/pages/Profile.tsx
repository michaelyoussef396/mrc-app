import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  Key,
  Loader2,
  MapPin
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete, type AddressValue } from '@/components/booking';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joinDate: string;
  avatar: string;
  startingAddress: AddressValue | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    joinDate: '',
    avatar: '',
    startingAddress: null,
  });

  const [editData, setEditData] = useState<ProfileData>({ ...profileData });

  // Load user data from Supabase Auth user_metadata
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);

        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('Auth error:', authError);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load user. Please login again.',
          });
          navigate('/login');
          return;
        }

        // Get profile data from user_metadata
        const meta = user.user_metadata || {};

        // Get first_name and last_name from metadata
        let firstName = meta.first_name || '';
        let lastName = meta.last_name || '';

        // Fallback: if no first/last name in metadata, try to parse from full_name
        if (!firstName && !lastName && meta.full_name) {
          const nameParts = meta.full_name.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        const phone = meta.phone || '';

        // Get starting address from user_metadata
        const startingAddress: AddressValue | null = meta.starting_address ? {
          street: meta.starting_address.street || '',
          suburb: meta.starting_address.suburb || '',
          state: meta.starting_address.state || 'VIC',
          postcode: meta.starting_address.postcode || '',
          fullAddress: meta.starting_address.fullAddress || '',
          lat: meta.starting_address.lat,
          lng: meta.starting_address.lng,
        } : null;

        // Format the join date
        const joinDate = user.created_at
          ? new Date(user.created_at).toLocaleDateString('en-AU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : '';

        // Get initials for avatar
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() ||
                        user.email?.charAt(0).toUpperCase() || 'U';

        const loadedData: ProfileData = {
          firstName,
          lastName,
          email: user.email || '',
          phone,
          joinDate,
          avatar: initials,
          startingAddress,
        };

        setProfileData(loadedData);
        setEditData(loadedData);

      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load profile data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [navigate, toast]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Update user_metadata using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: editData.firstName,
          last_name: editData.lastName,
          phone: editData.phone || '',
          starting_address: editData.startingAddress ? {
            street: editData.startingAddress.street,
            suburb: editData.startingAddress.suburb,
            state: editData.startingAddress.state,
            postcode: editData.startingAddress.postcode,
            fullAddress: editData.startingAddress.fullAddress,
            lat: editData.startingAddress.lat,
            lng: editData.startingAddress.lng,
          } : null,
        }
      });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      // Update local state
      setProfileData({
        ...editData,
        avatar: `${editData.firstName.charAt(0)}${editData.lastName.charAt(0)}`.toUpperCase() || profileData.avatar,
        startingAddress: editData.startingAddress,
      });
      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <button
          className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200 hover:text-gray-900"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 m-0">My Profile</h1>
        <div className="w-10"></div>
      </div>

      {/* Profile Content */}
      <div className="max-w-3xl mx-auto px-5 py-6">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          {/* Avatar Section */}
          <div className="flex flex-col items-center px-6 py-10 bg-gradient-to-br from-blue-900 to-blue-800 relative">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-4xl font-bold flex items-center justify-center border-4 border-white/20 shadow-xl">
                {profileData.avatar}
              </div>
              <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white border-3 border-blue-900 text-blue-900 flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:shadow-lg">
                <Camera size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-white/90 text-sm font-medium">
                <Calendar size={14} strokeWidth={2} />
                <span>Joined {profileData.joinDate}</span>
              </div>
            </div>
          </div>

          {/* Edit/Save Buttons */}
          <div className="px-6 py-5 border-b border-gray-200">
            {!isEditing ? (
              <button
                className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[15px] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={18} strokeWidth={2} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-[15px] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 size={18} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Save size={18} strokeWidth={2} />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 text-[15px] font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X size={18} strokeWidth={2} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="px-6 py-8 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* First Name */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <User size={16} strokeWidth={2} />
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    className="h-11 px-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-[15px] font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.firstName || '—'}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <User size={16} strokeWidth={2} />
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    className="h-11 px-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-[15px] font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.lastName || '—'}</p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <Mail size={16} strokeWidth={2} />
                  Email Address
                </label>
                <p className="text-[15px] text-gray-900 font-medium">{profileData.email || '—'}</p>
                {isEditing && (
                  <p className="text-xs text-gray-500">Email cannot be changed here. Contact admin if needed.</p>
                )}
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <Phone size={16} strokeWidth={2} />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    className="h-11 px-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-[15px] font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder="04XX XXX XXX"
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.phone || '—'}</p>
                )}
              </div>

              {/* Starting Address */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <MapPin size={16} strokeWidth={2} />
                  Starting Address
                </label>
                {isEditing ? (
                  <AddressAutocomplete
                    label=""
                    placeholder="Where you start each day (home address)"
                    value={editData.startingAddress || undefined}
                    onChange={(address) => setEditData({ ...editData, startingAddress: address })}
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">
                    {profileData.startingAddress?.fullAddress || '—'}
                  </p>
                )}
                {isEditing && (
                  <p className="text-xs text-gray-500">
                    This is used to calculate travel times for your first appointment each day.
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Account Settings Section - Only Change Password */}
          <div className="px-6 py-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Account Settings</h3>

            <div className="flex flex-col gap-3">

              <button
                className="flex items-center gap-3.5 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-white hover:border-blue-500 hover:shadow-sm transition-all text-left"
                onClick={() => navigate('/forgot-password')}
              >
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Key size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Change Password</h4>
                  <p className="text-sm text-gray-600 m-0">Update your password to keep your account secure</p>
                </div>
                <ArrowLeft size={18} strokeWidth={2} className="text-gray-400 transform rotate-180" />
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
