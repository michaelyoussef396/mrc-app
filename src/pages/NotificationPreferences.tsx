import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell, 
  Mail, 
  MessageSquare, 
  CheckCircle
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';

export const NotificationPreferences = () => {
  const navigate = useNavigate();
  
  // Notification settings state
  const [settings, setSettings] = useState({
    // Email Notifications
    emailNewLead: true,
    emailInspectionComplete: true,
    emailPaymentReceived: true,
    emailReportReady: false,
    emailWeeklySummary: true,
    
    // Push Notifications
    pushNewLead: true,
    pushInspectionReminder: true,
    pushJobUpdate: true,
    pushUrgentAlerts: true,
    
    // SMS Notifications
    smsUrgentOnly: true,
    smsInspectionReminder: false,
    smsPaymentReceived: false,
    
    // In-App Notifications
    inAppAllUpdates: true,
    inAppMentions: true,
    inAppComments: true,
  });

  const toggleSetting = (key: string) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleSaveSettings = () => {
    // TODO: Save to backend
    console.log('Saving notification settings:', settings);
    alert('Notification preferences saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <button 
          className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200 hover:text-gray-900"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 m-0">Notification Preferences</h1>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-6">
        
        {/* Info Banner */}
        <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-500 rounded-2xl mb-6">
          <Bell size={24} strokeWidth={2} className="text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="text-base font-bold text-blue-900 mb-1">Stay Informed</h3>
            <p className="text-sm text-blue-800 m-0 leading-relaxed">
              Choose how you want to receive notifications about your leads, inspections, and updates.
            </p>
          </div>
        </div>

        {/* Email Notifications Section */}
        <div className="bg-white rounded-2xl shadow-md mb-5 overflow-hidden">
          <div className="flex items-center gap-3.5 px-5 py-5 border-b border-gray-100 bg-gray-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Mail size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 m-0">Email Notifications</h2>
              <p className="text-sm text-gray-600 m-0">Receive updates via email</p>
            </div>
          </div>

          <div>
            
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">New Lead Assigned</h4>
                <p className="text-sm text-gray-600 m-0">Get notified when a new lead is assigned to you</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.emailNewLead}
                  onChange={() => toggleSetting('emailNewLead')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Inspection Completed</h4>
                <p className="text-sm text-gray-600 m-0">Notification when an inspection is marked complete</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.emailInspectionComplete}
                  onChange={() => toggleSetting('emailInspectionComplete')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Payment Received</h4>
                <p className="text-sm text-gray-600 m-0">Get notified when a payment is received</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.emailPaymentReceived}
                  onChange={() => toggleSetting('emailPaymentReceived')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Report Ready</h4>
                <p className="text-sm text-gray-600 m-0">Notification when inspection report is generated</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.emailReportReady}
                  onChange={() => toggleSetting('emailReportReady')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Weekly Summary</h4>
                <p className="text-sm text-gray-600 m-0">Receive a weekly summary of your activity</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.emailWeeklySummary}
                  onChange={() => toggleSetting('emailWeeklySummary')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

          </div>
        </div>

        {/* Push Notifications Section */}
        <div className="bg-white rounded-2xl shadow-md mb-5 overflow-hidden">
          <div className="flex items-center gap-3.5 px-5 py-5 border-b border-gray-100 bg-gray-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-600 flex items-center justify-center flex-shrink-0">
              <Bell size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 m-0">Push Notifications</h2>
              <p className="text-sm text-gray-600 m-0">Receive real-time alerts on your device</p>
            </div>
          </div>

          <div>
            
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">New Lead Alerts</h4>
                <p className="text-sm text-gray-600 m-0">Instant notification for new leads</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.pushNewLead}
                  onChange={() => toggleSetting('pushNewLead')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Inspection Reminders</h4>
                <p className="text-sm text-gray-600 m-0">Reminders 1 hour before scheduled inspections</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.pushInspectionReminder}
                  onChange={() => toggleSetting('pushInspectionReminder')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Job Updates</h4>
                <p className="text-sm text-gray-600 m-0">Status changes and important updates</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.pushJobUpdate}
                  onChange={() => toggleSetting('pushJobUpdate')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Urgent Alerts</h4>
                <p className="text-sm text-gray-600 m-0">Critical notifications requiring immediate action</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.pushUrgentAlerts}
                  onChange={() => toggleSetting('pushUrgentAlerts')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

          </div>
        </div>

        {/* SMS Notifications Section */}
        <div className="bg-white rounded-2xl shadow-md mb-5 overflow-hidden">
          <div className="flex items-center gap-3.5 px-5 py-5 border-b border-gray-100 bg-gray-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 m-0">SMS Notifications</h2>
              <p className="text-sm text-gray-600 m-0">Text message alerts (charges may apply)</p>
            </div>
          </div>

          <div>
            
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Urgent Only</h4>
                <p className="text-sm text-gray-600 m-0">Only receive SMS for urgent matters</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.smsUrgentOnly}
                  onChange={() => toggleSetting('smsUrgentOnly')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Inspection Reminders</h4>
                <p className="text-sm text-gray-600 m-0">SMS reminder before inspections</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.smsInspectionReminder}
                  onChange={() => toggleSetting('smsInspectionReminder')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Payment Confirmations</h4>
                <p className="text-sm text-gray-600 m-0">SMS when payments are received</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.smsPaymentReceived}
                  onChange={() => toggleSetting('smsPaymentReceived')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

          </div>
        </div>

        {/* In-App Notifications Section */}
        <div className="bg-white rounded-2xl shadow-md mb-5 overflow-hidden">
          <div className="flex items-center gap-3.5 px-5 py-5 border-b border-gray-100 bg-gray-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Bell size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 m-0">In-App Notifications</h2>
              <p className="text-sm text-gray-600 m-0">Notifications within the application</p>
            </div>
          </div>

          <div>
            
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">All Updates</h4>
                <p className="text-sm text-gray-600 m-0">Show all activity in notification center</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.inAppAllUpdates}
                  onChange={() => toggleSetting('inAppAllUpdates')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Mentions</h4>
                <p className="text-sm text-gray-600 m-0">When someone mentions you in comments</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.inAppMentions}
                  onChange={() => toggleSetting('inAppMentions')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-gray-900 mb-1">Comments</h4>
                <p className="text-sm text-gray-600 m-0">New comments on inspections and reports</p>
              </div>
              <label className="relative inline-block w-13 h-7 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0 peer"
                  checked={settings.inAppComments}
                  onChange={() => toggleSetting('inAppComments')}
                />
                <span className="absolute inset-0 bg-gray-300 rounded-full transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-1 before:bottom-1 before:bg-white before:rounded-full before:transition-transform before:shadow-md peer-checked:before:translate-x-6"></span>
              </label>
            </div>

          </div>
        </div>

        {/* Save Button */}
        <div className="pt-6">
          <button 
            className="w-full h-14 flex items-center justify-center gap-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-base font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            onClick={handleSaveSettings}
          >
            <CheckCircle size={20} strokeWidth={2} />
            Save Preferences
          </button>
        </div>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
