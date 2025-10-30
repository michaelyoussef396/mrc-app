import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  Shield,
  Bell,
  Key
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  
  // User profile data
  const [profileData, setProfileData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@mrc.com.au',
    phone: '0400 000 000',
    address: '123 Main St, Melbourne VIC 3000',
    role: 'Administrator',
    joinDate: 'January 15, 2024',
    avatar: 'A',
  });

  const [editData, setEditData] = useState({ ...profileData });

  const handleSave = () => {
    setProfileData({ ...editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

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
              <h2 className="text-2xl font-bold text-white mb-1">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <p className="text-sm text-white/80 mb-3 font-medium">{profileData.role}</p>
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
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-[15px] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  onClick={handleSave}
                >
                  <Save size={18} strokeWidth={2} />
                  Save Changes
                </button>
                <button 
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 text-[15px] font-semibold rounded-xl hover:bg-gray-200 transition-all"
                  onClick={handleCancel}
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
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.firstName}</p>
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
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <Mail size={16} strokeWidth={2} />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    className="h-11 px-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-[15px] font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.email}</p>
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
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.phone}</p>
                )}
              </div>

              {/* Address */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <MapPin size={16} strokeWidth={2} />
                  Address
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    className="h-11 px-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-[15px] font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  />
                ) : (
                  <p className="text-[15px] text-gray-900 font-medium">{profileData.address}</p>
                )}
              </div>

            </div>
          </div>

          {/* Account Settings Section */}
          <div className="px-6 py-8 border-b border-gray-200">
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

              <button 
                className="flex items-center gap-3.5 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-white hover:border-blue-500 hover:shadow-sm transition-all text-left"
                onClick={() => alert('Notification preferences coming soon!')}
              >
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bell size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Notification Preferences</h4>
                  <p className="text-sm text-gray-600 m-0">Manage how you receive notifications</p>
                </div>
                <ArrowLeft size={18} strokeWidth={2} className="text-gray-400 transform rotate-180" />
              </button>

              <button 
                className="flex items-center gap-3.5 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-white hover:border-blue-500 hover:shadow-sm transition-all text-left"
                onClick={() => alert('Privacy & security settings coming soon!')}
              >
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Privacy & Security</h4>
                  <p className="text-sm text-gray-600 m-0">Control your privacy and security settings</p>
                </div>
                <ArrowLeft size={18} strokeWidth={2} className="text-gray-400 transform rotate-180" />
              </button>

            </div>
          </div>

          {/* Stats Section */}
          <div className="px-6 py-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Activity Overview</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">47</div>
                <div className="text-sm text-gray-600 font-semibold">Total Leads</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">12</div>
                <div className="text-sm text-gray-600 font-semibold">Active Jobs</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">135</div>
                <div className="text-sm text-gray-600 font-semibold">Completed</div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">98%</div>
                <div className="text-sm text-gray-600 font-semibold">Success Rate</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
