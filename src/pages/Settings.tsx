import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  User,
  Users,
  UserPlus,
  Bell,
  Shield,
  Globe,
  Palette,
  HardDrive,
  Info,
  ChevronRight,
  Moon,
  Sun,
  Volume2,
  Database,
  Download,
  Trash2,
  LogOut,
  Mail,
  Key,
  Eye,
  HelpCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';

export default function Settings() {
  const navigate = useNavigate();
  
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const appVersion = "1.0.0";
  const storageUsed = "45.2 MB";
  const lastSync = "2 minutes ago";

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
        <h1 className="text-xl font-bold text-gray-900 m-0">Settings</h1>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-6">
        
        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Account</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => navigate('/profile')}
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
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
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

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Notification preferences coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Bell size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Notifications</h3>
                  <p className="text-sm text-gray-600 m-0">Manage notification preferences</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* User Management Section (Admin Only) */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">User Management</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
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

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => navigate('/manage-users?action=add')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <UserPlus size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Add New User</h3>
                  <p className="text-sm text-gray-600 m-0">Add a new technician or administrator</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* Appearance Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Appearance</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 flex items-center justify-center flex-shrink-0">
                  {darkMode ? <Moon size={20} strokeWidth={2} /> : <Sun size={20} strokeWidth={2} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Dark Mode</h3>
                  <p className="text-sm text-gray-600 m-0">Switch between light and dark theme</p>
                </div>
              </div>
              <label className="relative inline-block w-[52px] h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                />
                <span className={`absolute inset-0 rounded-full transition-all ${darkMode ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute h-[22px] w-[22px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform shadow-md ${darkMode ? 'transform translate-x-6' : ''}`}></span>
                </span>
              </label>
            </div>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Theme customization coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Palette size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Theme Customization</h3>
                  <p className="text-sm text-gray-600 m-0">Customize colors and appearance</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* System Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">System</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Volume2 size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Sound Effects</h3>
                  <p className="text-sm text-gray-600 m-0">Enable or disable sound effects</p>
                </div>
              </div>
              <label className="relative inline-block w-[52px] h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={soundEnabled}
                  onChange={() => setSoundEnabled(!soundEnabled)}
                />
                <span className={`absolute inset-0 rounded-full transition-all ${soundEnabled ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute h-[22px] w-[22px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform shadow-md ${soundEnabled ? 'transform translate-x-6' : ''}`}></span>
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Database size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Auto-Sync</h3>
                  <p className="text-sm text-gray-600 m-0">Automatically sync data in background</p>
                </div>
              </div>
              <label className="relative inline-block w-[52px] h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={autoSync}
                  onChange={() => setAutoSync(!autoSync)}
                />
                <span className={`absolute inset-0 rounded-full transition-all ${autoSync ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute h-[22px] w-[22px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform shadow-md ${autoSync ? 'transform translate-x-6' : ''}`}></span>
                </span>
              </label>
            </div>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Language settings coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Globe size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Language</h3>
                  <p className="text-sm text-gray-600 m-0">English (Australia)</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* Data & Storage Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Data & Storage</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <div className="flex flex-col gap-2 px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600 flex items-center justify-center flex-shrink-0">
                  <HardDrive size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Storage Used</h3>
                  <p className="text-sm text-gray-600 m-0">{storageUsed} of 100 MB</p>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden ml-14">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4 py-4 border-b border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600 flex items-center justify-center flex-shrink-0">
                <Database size={20} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Last Sync</h3>
                <p className="text-sm text-gray-600 m-0">{lastSync}</p>
              </div>
            </div>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => {
                if (confirm('Are you sure you want to download all your data?')) {
                  alert('Preparing data export...');
                }
              }}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600 flex items-center justify-center flex-shrink-0">
                  <Download size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Download Data</h3>
                  <p className="text-sm text-gray-600 m-0">Export all your data</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-red-50 transition-colors cursor-pointer text-left"
              onClick={() => {
                if (confirm('Are you sure? This will clear all cached data.')) {
                  alert('Cache cleared successfully!');
                }
              }}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-red-600 mb-1">Clear Cache</h3>
                  <p className="text-sm text-gray-600 m-0">Free up storage space</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* Security & Privacy Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Security & Privacy</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Two-factor authentication coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-600 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600 m-0">Add extra security to your account</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Privacy settings coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-600 flex items-center justify-center flex-shrink-0">
                  <Eye size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Privacy Settings</h3>
                  <p className="text-sm text-gray-600 m-0">Control your privacy preferences</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* Help & Support Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">Help & Support</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Help center coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Help Center</h3>
                  <p className="text-sm text-gray-600 m-0">Find answers and tutorials</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => window.location.href = 'mailto:support@mrc.com.au'}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Mail size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Contact Support</h3>
                  <p className="text-sm text-gray-600 m-0">Get help from our team</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Bug report form coming soon!')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Report a Bug</h3>
                  <p className="text-sm text-gray-600 m-0">Help us improve the app</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

          </div>
        </div>

        {/* About Section */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 ml-1">About</h2>
          
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            
            <div className="flex items-center gap-3.5 px-4 py-4 border-b border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                <Info size={20} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Version</h3>
                <p className="text-sm text-gray-600 m-0">MRC Lead Management v{appVersion}</p>
              </div>
            </div>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Terms of Service')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Terms of Service</h3>
                  <p className="text-sm text-gray-600 m-0">Read our terms and conditions</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-gray-50 transition-colors cursor-pointer text-left"
              onClick={() => alert('Privacy Policy')}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Privacy Policy</h3>
                  <p className="text-sm text-gray-600 m-0">How we handle your data</p>
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
              className="flex items-center justify-between gap-3 px-4 py-4 w-full border-b border-gray-100 bg-transparent hover:bg-red-50 transition-colors cursor-pointer text-left"
              onClick={() => {
                if (confirm('Are you sure you want to sign out?')) {
                  navigate('/');
                }
              }}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <LogOut size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-red-600 mb-1">Sign Out</h3>
                  <p className="text-sm text-gray-600 m-0">Log out of your account</p>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
            </button>

            <button 
              className="flex items-center justify-between gap-3 px-4 py-4 w-full bg-transparent hover:bg-red-50 transition-colors cursor-pointer text-left"
              onClick={() => {
                if (confirm('WARNING: This will permanently delete your account and all data. This cannot be undone!')) {
                  const confirmation = prompt('Type DELETE to confirm account deletion:');
                  if (confirmation === 'DELETE') {
                    alert('Account deletion request submitted.');
                  }
                }
              }}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-red-600 mb-1">Delete Account</h3>
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
            Made with ❤️ in Melbourne, Australia
          </p>
          <p className="text-xs text-gray-500 m-0">
            © 2025 Mould & Restoration Co. All rights reserved.
          </p>
        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
