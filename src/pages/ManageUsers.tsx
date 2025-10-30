import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  User,
  Mail,
  Phone,
  Key,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';

interface UserType {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  joinDate: string;
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  const [users, setUsers] = useState<UserType[]>([
    {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@mrc.com.au',
      phone: '0400 000 000',
      role: 'Administrator',
      status: 'Active',
      joinDate: '2024-01-15',
    },
    {
      id: 2,
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@mrc.com.au',
      phone: '0400 111 222',
      role: 'Technician',
      status: 'Active',
      joinDate: '2024-02-20',
    },
  ]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Technician',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^04\d{8}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid Australian mobile number (e.g., 0400 000 000)';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const newUser: UserType = {
      id: users.length + 1,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
    };
    
    setUsers([...users, newUser]);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', role: 'Technician', password: '', confirmPassword: '' });
    setFormErrors({});
    setShowAddModal(false);
    alert('User added successfully!');
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      setUsers(users.filter(user => user.id !== userId));
      alert('User removed successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">
      <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <button className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 m-0">Manage Users</h1>
        <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105" onClick={() => setShowAddModal(true)}>
          <UserPlus size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex flex-col gap-3 mb-5 bg-white p-4 rounded-2xl shadow-md sm:flex-row sm:p-5">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users size={20} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 leading-none mb-1">{users.length}</div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Users</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-600 flex items-center justify-center flex-shrink-0">
              <Shield size={20} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 leading-none mb-1">{users.filter(u => u.role === 'Administrator').length}</div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Admins</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
              <User size={20} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 leading-none mb-1">{users.filter(u => u.role === 'Technician').length}</div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Technicians</div>
            </div>
          </div>
        </div>

        <button className="w-full h-14 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-base font-semibold border-0 rounded-2xl cursor-pointer transition-all mb-5 shadow-md hover:-translate-y-0.5" onClick={() => setShowAddModal(true)}>
          <UserPlus size={20} strokeWidth={2} />Add New User
        </button>

        <div className="flex flex-col gap-3">
          {users.map(user => (
            <div key={user.id} className="flex flex-col gap-4 p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all md:flex-row md:items-center md:p-5 md:gap-5">
              
              {/* Top Section: Avatar + Info + Role */}
              <div className="flex items-start gap-3 flex-1 md:items-center">
                <div className="flex-shrink-0">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white ${user.role === 'Administrator' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 md:flex md:items-center md:gap-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-2 break-words md:mb-0">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${user.role === 'Administrator' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700'}`}>
                    {user.role === 'Administrator' ? (
                      <Shield size={14} strokeWidth={2} />
                    ) : (
                      <User size={14} strokeWidth={2} />
                    )}
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl md:flex-row md:gap-4 md:p-0 md:bg-transparent md:flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                  <Mail size={14} strokeWidth={2} className="flex-shrink-0" />
                  <span className="break-all">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} strokeWidth={2} className="flex-shrink-0" />
                  <span>{user.phone}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-blue-600 flex items-center justify-center gap-2 font-semibold text-sm hover:bg-blue-50 transition-colors md:w-11 md:flex-none"
                  onClick={() => alert('Edit user functionality coming soon!')}
                >
                  <Edit2 size={18} strokeWidth={2} />
                  <span className="md:hidden">Edit</span>
                </button>
                <button 
                  className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-colors md:w-11 md:flex-none ${user.id === 1 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                  onClick={() => user.id !== 1 && handleDeleteUser(user.id)}
                  disabled={user.id === 1}
                >
                  <Trash2 size={18} strokeWidth={2} />
                  <span className="md:hidden">Delete</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 bg-white z-[999] overflow-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-auto md:w-[600px] md:max-w-[calc(100vw-40px)] md:max-h-[calc(100vh-80px)] md:rounded-3xl md:shadow-2xl">
            <div className="flex justify-between items-center px-4 py-5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 md:px-6 md:py-6 md:static">
              <h2 className="text-lg font-bold text-gray-900 m-0 md:text-xl">Add New User</h2>
              <button className="w-9 h-9 rounded-lg bg-transparent border-0 text-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setShowAddModal(false)}>
                <X size={24} strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="px-4 py-5 md:px-6 md:py-6 md:max-h-[calc(100vh-200px)] md:overflow-y-auto">
              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Personal Information</h3>
                <div className="flex flex-col gap-4 mb-4 md:flex-row">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                    <input type="text" className={`w-full h-12 px-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${formErrors.firstName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" />
                    {formErrors.firstName && <span className="block text-xs text-red-500 mt-1">{formErrors.firstName}</span>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                    <input type="text" className={`w-full h-12 px-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${formErrors.lastName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Smith" />
                    {formErrors.lastName && <span className="block text-xs text-red-500 mt-1">{formErrors.lastName}</span>}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" className={`w-full h-12 pl-11 pr-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${formErrors.email ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john.smith@mrc.com.au" />
                  </div>
                  {formErrors.email && <span className="block text-xs text-red-500 mt-1">{formErrors.email}</span>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" className={`w-full h-12 pl-11 pr-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${formErrors.phone ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0400 000 000" />
                  </div>
                  {formErrors.phone && <span className="block text-xs text-red-500 mt-1">{formErrors.phone}</span>}
                </div>
              </div>

              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">User Role</h3>
                <div className="flex flex-col gap-3">
                  <label className={`block cursor-pointer`}>
                    <input type="radio" name="role" value="Technician" checked={formData.role === 'Technician'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="hidden" />
                    <div className={`flex gap-3.5 p-4 bg-gray-50 border-2 rounded-xl transition-all ${formData.role === 'Technician' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <User size={24} strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Technician</h4>
                        <p className="text-sm text-gray-600 m-0 leading-snug">Can perform inspections, manage leads, and generate reports</p>
                      </div>
                    </div>
                  </label>
                  <label className={`block cursor-pointer`}>
                    <input type="radio" name="role" value="Administrator" checked={formData.role === 'Administrator'} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="hidden" />
                    <div className={`flex gap-3.5 p-4 bg-gray-50 border-2 rounded-xl transition-all ${formData.role === 'Administrator' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-600 flex items-center justify-center flex-shrink-0">
                        <Shield size={24} strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Administrator</h4>
                        <p className="text-sm text-gray-600 m-0 leading-snug">Full access including user management and system settings</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Password Setup</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <Key size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} className={`w-full h-11 pl-11 pr-11 bg-gray-50 border-2 rounded-xl ${formErrors.password ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Minimum 8 characters" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-gray-400 cursor-pointer p-1 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErrors.password && <span className="block text-xs text-red-500 mt-1">{formErrors.password}</span>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <Key size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showConfirmPassword ? 'text' : 'password'} className={`w-full h-11 pl-11 pr-11 bg-gray-50 border-2 rounded-xl ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Re-enter password" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-gray-400 cursor-pointer p-1 hover:text-gray-600" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <span className="block text-xs text-red-500 mt-1">{formErrors.confirmPassword}</span>}
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-600">
                  <AlertCircle size={16} strokeWidth={2} />
                  <span>Password must be at least 8 characters long</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-6 border-t border-gray-200 md:flex-row md:gap-3">
                <button type="button" className="flex-1 h-13 bg-gray-100 text-gray-700 border-0 rounded-xl font-semibold cursor-pointer hover:bg-gray-200 transition-all md:h-12" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="flex-1 h-13 bg-gradient-to-r from-green-500 to-green-600 text-white border-0 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-all shadow-md md:h-12"><Check size={20} strokeWidth={2} />Add User</button>
              </div>
            </form>
          </div>
        </>
      )}
      <MobileBottomNav />
    </div>
  );
}
