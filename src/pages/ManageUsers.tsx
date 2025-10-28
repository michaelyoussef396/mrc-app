import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Edit, Trash2, UserX, Info, Shield, Mail, Phone, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joined: string;
  lastLogin: string;
  status: "active" | "deactivated";
  initials: string;
  avatarColor: string;
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "administrator",
    password: "",
    sendWelcomeEmail: true,
  });

  // Users data
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "System Administrator",
      email: "admin@mrc.com.au",
      phone: "0412 345 678",
      role: "Administrator",
      joined: "15 Jan 2025",
      lastLogin: "Today at 9:15 AM",
      status: "active",
      initials: "SA",
      avatarColor: "bg-blue-600",
    },
    {
      id: "2",
      name: "Sarah Martinez",
      email: "sarah@mrc.com.au",
      phone: "0423 456 789",
      role: "Administrator",
      joined: "15 Jan 2025",
      lastLogin: "Yesterday at 3:30 PM",
      status: "active",
      initials: "SM",
      avatarColor: "bg-purple-600",
    },
  ]);

  const activeUsers = users.filter((u) => u.status === "active");
  const deactivatedUsers = users.filter((u) => u.status === "deactivated");

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "Temp2025!";
    for (let i = 0; i < 3; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    toast({
      title: "Password Generated",
      description: "Temporary password has been generated",
    });
  };

  const handleAddUser = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    toast({
      title: "Success",
      description: `User created successfully!`,
    });

    if (formData.sendWelcomeEmail) {
      toast({
        title: "Email Sent",
        description: `Welcome email sent to ${formData.email}`,
      });
    }

    setAddModalOpen(false);
    resetForm();
  };

  const handleEditUser = () => {
    toast({
      title: "Success",
      description: "User updated successfully",
    });
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeactivateUser = () => {
    toast({
      title: "User Deactivated",
      description: `${selectedUser?.name}'s account has been deactivated`,
    });
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = () => {
    toast({
      variant: "destructive",
      title: "User Deleted",
      description: `${selectedUser?.name}'s account has been permanently deleted`,
    });
    setPermanentDeleteOpen(false);
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const handleResetPassword = () => {
    toast({
      title: "Password Reset Email Sent",
      description: `Reset email sent to ${selectedUser?.email}`,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "administrator",
      password: "",
      sendWelcomeEmail: true,
    });
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.toLowerCase(),
      password: "",
      sendWelcomeEmail: false,
    });
    setEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <TopNavigation />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="p-1">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">Manage Users</h1>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            You are viewing all system users. Only administrators can access this page.
          </p>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Manage Users</h2>
            <p className="text-sm text-muted-foreground mt-1">Add and manage technician accounts</p>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Technician</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="administrator">Administrators</SelectItem>
              <SelectItem value="technician">Technicians</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              Active Users
              <Badge variant="secondary" className="rounded-full">
                {activeUsers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="deactivated" className="gap-2">
              Deactivated Users
              <Badge variant="secondary" className="rounded-full">
                {deactivatedUsers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Active Users */}
          <TabsContent value="active" className="mt-6">
            {activeUsers.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No active users</h3>
                <p className="text-sm text-muted-foreground">Add your first technician to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeUsers.map((user) => (
                  <div key={user.id} className="bg-card rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                    {/* Mobile View */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-full ${user.avatarColor} text-white flex items-center justify-center text-lg font-bold flex-shrink-0`}>
                          {user.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{user.role}</span>
                            <span>•</span>
                            <span>{user.joined}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Last login: {user.lastLogin}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Deactivate
                        </Button>
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${user.avatarColor} text-white flex items-center justify-center text-lg font-bold flex-shrink-0`}>
                        {user.initials}
                      </div>
                      <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                        <div>
                          <h3 className="font-semibold text-foreground">{user.name}</h3>
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">Last: {user.lastLogin}</p>
                        </div>
                        <div>
                          <Badge variant="secondary">{user.role}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{user.joined}</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deactivated Users */}
          <TabsContent value="deactivated" className="mt-6">
            <div className="text-center py-12 bg-card rounded-lg">
              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No deactivated users</h3>
              <p className="text-sm text-muted-foreground">Deactivated users will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Technician</DialogTitle>
            <DialogDescription>Create a new user account for a technician</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., john@mrc.com.au"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">This will be their login email</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="04XX XXX XXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Australian mobile number</p>
            </div>

            <div>
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrator (full access)</SelectItem>
                  <SelectItem value="technician" disabled>
                    Technician (limited access - coming soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password">
                Temporary Password <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="password"
                  type="text"
                  placeholder="Enter temporary password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">User will be asked to change on first login</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="welcomeEmail"
                checked={formData.sendWelcomeEmail}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sendWelcomeEmail: checked as boolean })
                }
              />
              <Label htmlFor="welcomeEmail" className="text-sm cursor-pointer">
                Send welcome email with login instructions
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User - {selectedUser?.name}</DialogTitle>
            <DialogDescription>Update user account information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrator</SelectItem>
                  <SelectItem value="technician" disabled>
                    Technician (coming soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={handleResetPassword}>
                <Mail className="h-4 w-4 mr-2" />
                Send Password Reset Email
              </Button>
            </div>

            <div className="pt-2 border-t border-destructive/20">
              <p className="text-sm font-semibold text-foreground mb-2">Danger Zone</p>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => {
                  setEditModalOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate Account
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <UserX className="h-6 w-6" />
              <AlertDialogTitle>Deactivate User Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{selectedUser?.name}</strong>'s account?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="text-sm font-semibold text-foreground mb-2">This will:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Prevent user from logging in</li>
              <li>Keep all their data intact</li>
              <li>Can be reactivated later</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Alternative:</strong> You can delete the account permanently, but this cannot be undone.
            </p>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateUser}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Deactivate
            </AlertDialogAction>
            <button
              onClick={() => {
                setDeleteDialogOpen(false);
                setPermanentDeleteOpen(true);
              }}
              className="text-sm text-destructive hover:underline"
            >
              Delete Permanently Instead
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <Trash2 className="h-6 w-6" />
              <AlertDialogTitle>Delete {selectedUser?.name}'s Account Permanently?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-destructive font-semibold">
              This CANNOT be undone!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <p className="text-sm font-semibold text-foreground mb-2">This will:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Remove user from system</li>
              <li>• Past inspections remain</li>
              <li>• Reports remain unchanged</li>
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPermanentDeleteOpen(false);
                setDeleteDialogOpen(true);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
