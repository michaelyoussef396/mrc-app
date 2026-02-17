import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  User,
  Mail,
  Phone,
  Send,
  X,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Shield,
  ChevronDown
} from 'lucide-react';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete, type AddressValue } from '@/components/booking';
import { sendEmail, buildWelcomeEmailHtml } from '@/lib/api/notifications';

interface AddressData {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  fullAddress: string;
  lat?: number;
  lng?: number;
}

interface UserType {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  is_active: boolean;
  role: 'admin' | 'technician' | 'developer' | null;
  starting_address: AddressData | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'technician' | 'developer';
  password: string;
  confirmPassword: string;
  homeAddress: AddressValue | null;
}

// API functions
const fetchUsers = async (): Promise<UserType[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.users;
};

const createUser = async (userData: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  role: 'admin' | 'technician' | 'developer';
  home_address?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    fullAddress: string;
    lat?: number;
    lng?: number;
  } | null;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }
  );

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
};

const deleteUser = async (userId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?userId=${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
};

const updateUser = async (userId: string, userData: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  starting_address?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    fullAddress: string;
    lat?: number;
    lng?: number;
  } | null;
  password?: string;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?userId=${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }
  );

  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
};

export default function ManageUsers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  // Fetch users from Edge Function
  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['manage-users'],
    queryFn: fetchUsers,
  });

  // Create user mutation (direct creation with password)
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
      toast({
        title: 'User created successfully',
        description: `${data.user?.first_name} ${data.user?.last_name} can now login with their credentials.`,
      });

      // Send welcome email (fire-and-forget)
      if (data.user?.email) {
        sendEmail({
          to: data.user.email,
          subject: 'Welcome to Mould & Restoration Co.',
          html: buildWelcomeEmailHtml({
            firstName: data.user.first_name,
            email: data.user.email,
            role: data.user.role || formData.role,
          }),
          templateName: 'welcome',
        }).catch(() => {}); // fire-and-forget
      }

      setShowAddModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
      toast({
        title: 'User deleted',
        description: 'User has been removed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editFormData, setEditFormData] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    homeAddress: AddressValue | null;
    password: string;
    confirmPassword: string;
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    homeAddress: null,
    password: '',
    confirmPassword: '',
  });

  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Parameters<typeof updateUser>[1] }) =>
      updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
      toast({
        title: 'User updated',
        description: 'User details have been updated successfully.',
      });
      setShowEditModal(false);
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      homeAddress: user.starting_address ? {
        street: user.starting_address.street,
        suburb: user.starting_address.suburb,
        state: user.starting_address.state,
        postcode: user.starting_address.postcode,
        fullAddress: user.starting_address.fullAddress,
        lat: user.starting_address.lat,
        lng: user.starting_address.lng,
      } : null,
      password: '',
      confirmPassword: '',
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!editFormData.firstName.trim()) errors.firstName = 'First name is required';
    if (!editFormData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!editFormData.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^04\d{8}$/.test(editFormData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid Australian mobile number';

    // Starting address mandatory for technicians
    if (editingUser?.role === 'technician' && !editFormData.homeAddress) {
      errors.homeAddress = 'Starting address is required for technicians';
    }

    // Password validation (only if user entered a password)
    if (editFormData.password) {
      const passwordError = validatePassword(editFormData.password);
      if (passwordError) errors.password = passwordError;
      if (editFormData.password !== editFormData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !validateEditForm()) return;

    const data: Parameters<typeof updateUser>[1] = {
      first_name: editFormData.firstName.trim(),
      last_name: editFormData.lastName.trim(),
      phone: editFormData.phone.replace(/\s/g, ''),
      starting_address: editFormData.homeAddress ? {
        street: editFormData.homeAddress.street,
        suburb: editFormData.homeAddress.suburb,
        state: editFormData.homeAddress.state,
        postcode: editFormData.homeAddress.postcode,
        fullAddress: editFormData.homeAddress.fullAddress,
        lat: editFormData.homeAddress.lat,
        lng: editFormData.homeAddress.lng,
      } : null,
    };

    if (editFormData.password) {
      data.password = editFormData.password;
    }

    updateMutation.mutate({ userId: editingUser.id, data });
  };

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'technician',
    password: '',
    confirmPassword: '',
    homeAddress: null,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'technician',
      password: '',
      confirmPassword: '',
      homeAddress: null,
    });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Password validation helper
  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character';
    return null;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^04\d{8}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = 'Invalid Australian mobile number (e.g., 0400 000 000)';

    // Starting address mandatory for technicians
    if (formData.role === 'technician' && !formData.homeAddress) {
      errors.homeAddress = 'Starting address is required for technicians';
    }

    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    // Confirm password
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm the password';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate({
      email: formData.email.toLowerCase().trim(),
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone: formData.phone.replace(/\s/g, ''),
      password: formData.password,
      role: formData.role,
      home_address: formData.homeAddress ? {
        street: formData.homeAddress.street,
        suburb: formData.homeAddress.suburb,
        state: formData.homeAddress.state,
        postcode: formData.homeAddress.postcode,
        fullAddress: formData.homeAddress.fullAddress,
        lat: formData.homeAddress.lat,
        lng: formData.homeAddress.lng,
      } : null,
    });
  };

  const handleDeleteUser = (user: UserType) => {
    if (confirm(`Are you sure you want to remove ${user.full_name}? This action cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  // Helper to split full_name into first/last
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  // Stats
  const totalUsers = users.length;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">
        <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <button className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 m-0">Manage Users</h1>
          <div className="w-10" />
        </div>
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="mx-auto mb-3 text-red-500" size={48} />
            <h3 className="text-lg font-bold text-red-700 mb-2">Access Denied</h3>
            <p className="text-red-600 mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-24">
      <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <button className="w-10 h-10 rounded-xl bg-gray-100 border-0 text-gray-700 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 m-0">Manage Users</h1>
        <div className="flex gap-2">
          <button
            className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 border-0 flex items-center justify-center cursor-pointer transition-all hover:bg-gray-200"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={18} strokeWidth={2} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105" onClick={() => setShowAddModal(true)}>
            <UserPlus size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex mb-5 bg-white p-4 rounded-2xl shadow-md sm:p-5">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users size={20} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 leading-none mb-1">{isLoading ? '-' : totalUsers}</div>
              <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Users</div>
            </div>
          </div>
        </div>

        <button className="w-full h-14 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-base font-semibold border-0 rounded-2xl cursor-pointer transition-all mb-5 shadow-md hover:-translate-y-0.5" onClick={() => setShowAddModal(true)}>
          <UserPlus size={20} strokeWidth={2} />Add New User
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading users...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map(user => (
              <div key={user.id} className="flex flex-col gap-4 p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all md:flex-row md:items-center md:p-5 md:gap-5">

                {/* Top Section: Avatar + Info */}
                <div className="flex items-start gap-3 flex-1 md:items-center">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-blue-500 to-blue-600">
                      {getInitials(user.full_name)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 md:flex md:items-center md:gap-3">
                    <h3 className="text-base font-semibold text-gray-900 break-words">
                      {user.full_name}
                    </h3>
                    {user.role && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ml-2 ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'developer' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    )}
                    {!user.is_active && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 ml-2">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl md:flex-row md:gap-4 md:p-0 md:bg-transparent md:flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <Mail size={14} strokeWidth={2} className="flex-shrink-0" />
                    <span className="break-all">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} strokeWidth={2} className="flex-shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    className="flex-1 h-11 rounded-xl bg-gray-100 text-blue-600 flex items-center justify-center gap-2 font-semibold text-sm hover:bg-blue-50 transition-colors md:w-11 md:flex-none"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit2 size={18} strokeWidth={2} />
                    <span className="md:hidden">Edit</span>
                  </button>
                  <button
                    className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-colors md:w-11 md:flex-none ${deleteMutation.isPending ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    onClick={() => handleDeleteUser(user)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 size={18} strokeWidth={2} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} strokeWidth={2} />
                    )}
                    <span className="md:hidden">Delete</span>
                  </button>
                </div>

              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p>No users found. Add your first user to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]" onClick={() => { setShowAddModal(false); resetForm(); }} />
          <div className="fixed inset-0 bg-white z-[999] overflow-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-auto md:w-[600px] md:max-w-[calc(100vw-40px)] md:max-h-[calc(100vh-80px)] md:rounded-3xl md:shadow-2xl">
            <div className="flex justify-between items-center px-4 py-5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 md:px-6 md:py-6 md:static">
              <h2 className="text-lg font-bold text-gray-900 m-0 md:text-xl">Add New User</h2>
              <button className="w-9 h-9 rounded-lg bg-transparent border-0 text-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => { setShowAddModal(false); resetForm(); }}>
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
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <MapPin size={16} strokeWidth={2} />
                      Starting Address {formData.role === 'technician' ? '*' : '(Optional)'}
                    </span>
                  </label>
                  <AddressAutocomplete
                    label=""
                    placeholder="Home address for travel time calculations"
                    value={formData.homeAddress || undefined}
                    onChange={(address) => setFormData({ ...formData, homeAddress: address })}
                  />
                  {formErrors.homeAddress && <span className="block text-xs text-red-500 mt-1">{formErrors.homeAddress}</span>}
                  <p className="text-xs text-gray-500 mt-1.5">
                    Where they start each day. Used to calculate travel times for first appointments.
                    {formData.role === 'technician' && ' Required for technicians.'}
                  </p>
                </div>
              </div>

              {/* Role Section */}
              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Role Assignment</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Shield size={16} strokeWidth={2} />
                      Role *
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full h-12 px-3.5 pr-10 bg-gray-50 border-2 border-gray-200 rounded-xl text-base appearance-none cursor-pointer focus:outline-none focus:border-blue-500 focus:bg-white md:h-11 md:text-[15px]"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as FormData['role'] })}
                    >
                      <option value="technician">Technician</option>
                      <option value="admin">Admin</option>
                      <option value="developer">Developer</option>
                    </select>
                    <ChevronDown size={18} strokeWidth={2} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formData.role === 'technician' && 'Can view assigned jobs, complete inspections, and submit reports.'}
                    {formData.role === 'admin' && 'Full access to all leads, reports, users, and system settings.'}
                    {formData.role === 'developer' && 'Full access plus developer tools and system diagnostics.'}
                  </p>
                </div>
              </div>

              {/* Password Section */}
              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Set Password</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <Lock size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full h-12 pl-11 pr-11 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${formErrors.password ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                    </button>
                  </div>
                  {formErrors.password && <span className="block text-xs text-red-500 mt-1">{formErrors.password}</span>}
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-500">
                    Password must contain: 8+ characters, uppercase, lowercase, number, and special character (!@#$%^&*)
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <Lock size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`w-full h-12 pl-11 pr-11 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <span className="block text-xs text-red-500 mt-1">{formErrors.confirmPassword}</span>}
                </div>
              </div>

              <div className="mb-7">
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-xl text-sm text-green-700">
                  <Check size={16} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                  <span>User will be created with the password you set. They can login immediately after creation.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-6 border-t border-gray-200 md:flex-row md:gap-3 pb-6">
                <button type="button" className="flex-1 h-13 bg-gray-100 text-gray-700 border-0 rounded-xl font-semibold cursor-pointer hover:bg-gray-200 transition-all md:h-12" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</button>
                <button
                  type="submit"
                  className="flex-1 h-13 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-all shadow-md md:h-12 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <UserPlus size={20} strokeWidth={2} />
                  )}
                  {createMutation.isPending ? 'Creating...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]" onClick={() => { setShowEditModal(false); setEditingUser(null); }} />
          <div className="fixed inset-0 bg-white z-[999] overflow-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-auto md:w-[600px] md:max-w-[calc(100vw-40px)] md:max-h-[calc(100vh-80px)] md:rounded-3xl md:shadow-2xl">
            <div className="flex justify-between items-center px-4 py-5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 md:px-6 md:py-6 md:static">
              <h2 className="text-lg font-bold text-gray-900 m-0 md:text-xl">Edit User</h2>
              <button className="w-9 h-9 rounded-lg bg-transparent border-0 text-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => { setShowEditModal(false); setEditingUser(null); }}>
                <X size={24} strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="px-4 py-5 md:px-6 md:py-6 md:max-h-[calc(100vh-200px)] md:overflow-y-auto">
              {/* Email (read-only) */}
              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Account</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      className="w-full h-12 pl-11 pr-3.5 bg-gray-100 border-2 border-gray-200 rounded-xl text-base text-gray-500 cursor-not-allowed md:h-11 md:text-[15px]"
                      value={editingUser.email}
                      disabled
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Email cannot be changed.</p>
                </div>
                {editingUser.role && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <Shield size={16} strokeWidth={2} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Role: <span className="font-semibold capitalize">{editingUser.role}</span></span>
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Personal Information</h3>
                <div className="flex flex-col gap-4 mb-4 md:flex-row">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                    <input type="text" className={`w-full h-12 px-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${editFormErrors.firstName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={editFormData.firstName} onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })} />
                    {editFormErrors.firstName && <span className="block text-xs text-red-500 mt-1">{editFormErrors.firstName}</span>}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                    <input type="text" className={`w-full h-12 px-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${editFormErrors.lastName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={editFormData.lastName} onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })} />
                    {editFormErrors.lastName && <span className="block text-xs text-red-500 mt-1">{editFormErrors.lastName}</span>}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" className={`w-full h-12 pl-11 pr-3.5 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${editFormErrors.phone ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`} value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} placeholder="0400 000 000" />
                  </div>
                  {editFormErrors.phone && <span className="block text-xs text-red-500 mt-1">{editFormErrors.phone}</span>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <MapPin size={16} strokeWidth={2} />
                      Starting Address {editingUser.role === 'technician' ? '*' : '(Optional)'}
                    </span>
                  </label>
                  <AddressAutocomplete
                    label=""
                    placeholder="Home address for travel time calculations"
                    value={editFormData.homeAddress || undefined}
                    onChange={(address) => setEditFormData({ ...editFormData, homeAddress: address })}
                  />
                  {editFormErrors.homeAddress && <span className="block text-xs text-red-500 mt-1">{editFormErrors.homeAddress}</span>}
                </div>
              </div>

              {/* Change Password (Optional) */}
              <div className="mb-7">
                <h3 className="text-[15px] font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">Change Password (Optional)</h3>
                <p className="text-xs text-gray-500 mb-4">Leave blank to keep the current password.</p>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <Lock size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full h-12 pl-11 pr-11 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${editFormErrors.password ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`}
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                    </button>
                  </div>
                  {editFormErrors.password && <span className="block text-xs text-red-500 mt-1">{editFormErrors.password}</span>}
                </div>
                {editFormData.password && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className={`w-full h-12 pl-11 pr-11 bg-gray-50 border-2 rounded-xl text-base md:h-11 md:text-[15px] ${editFormErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-blue-500 focus:bg-white`}
                        value={editFormData.confirmPassword}
                        onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                      </button>
                    </div>
                    {editFormErrors.confirmPassword && <span className="block text-xs text-red-500 mt-1">{editFormErrors.confirmPassword}</span>}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-6 border-t border-gray-200 md:flex-row md:gap-3 pb-6">
                <button type="button" className="flex-1 h-13 bg-gray-100 text-gray-700 border-0 rounded-xl font-semibold cursor-pointer hover:bg-gray-200 transition-all md:h-12" onClick={() => { setShowEditModal(false); setEditingUser(null); }}>Cancel</button>
                <button
                  type="submit"
                  className="flex-1 h-13 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-all shadow-md md:h-12 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 size={20} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Check size={20} strokeWidth={2} />
                  )}
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <MobileBottomNav />
    </div>
  );
}
