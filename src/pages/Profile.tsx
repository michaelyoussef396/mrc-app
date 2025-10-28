import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Shield, Lock, Clock, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { TopNavigation } from "@/components/dashboard/TopNavigation";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modal states
  const [editModal, setEditModal] = useState<{ open: boolean; field: string; value: string }>({
    open: false,
    field: "",
    value: "",
  });
  const [passwordModal, setPasswordModal] = useState(false);

  // Password modal states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  // User data
  const userData = {
    name: "System Administrator",
    email: "admin@mrc.com.au",
    phone: "0412 345 678",
    role: "Administrator",
    lastLogin: "Today at 9:15 AM",
    inspections: 127,
    reports: 127,
    memberSince: "15 Jan 2025",
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleEdit = (field: string, currentValue: string) => {
    setEditModal({ open: true, field, value: currentValue });
  };

  const handleSaveEdit = () => {
    toast({
      title: "Success",
      description: `${editModal.field} updated successfully`,
    });
    setEditModal({ open: false, field: "", value: "" });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecialChar) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must meet all requirements",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Password changed successfully",
    });
    setPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleEnable2FA = () => {
    toast({
      title: "Coming Soon",
      description: "Two-Factor Authentication will be available soon",
    });
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
        <h1 className="text-lg font-semibold">My Profile</h1>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Profile Header */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
              {getInitials(userData.name)}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{userData.name}</h2>
          <p className="text-muted-foreground mb-2">{userData.email}</p>
          <p className="text-sm text-muted-foreground">Member since: {userData.memberSince}</p>
        </div>

        {/* Account Information Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Account Information</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                <p className="font-semibold text-foreground">{userData.name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit("Full Name", userData.name)}
              >
                Edit
              </Button>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email Address</p>
                <p className="font-semibold text-foreground">{userData.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit("Email Address", userData.email)}
              >
                Edit
              </Button>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                <p className="font-semibold text-foreground">{userData.phone}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit("Phone Number", userData.phone)}
              >
                Edit
              </Button>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                <p className="font-semibold text-foreground">{userData.role}</p>
              </div>
              <span className="text-sm text-muted-foreground italic">Read-only</span>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Security</h3>
          </div>

          <div className="space-y-3">
            <div className="bg-card rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Password</p>
                  <p className="font-semibold text-foreground">••••••••••••</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPasswordModal(true)}>
                  Change Password
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Last changed: 15 days ago</p>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Two-Factor Authentication</p>
                  <p className="font-semibold text-foreground">Not enabled</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleEnable2FA}>
                  Enable 2FA
                </Button>
              </div>
              <p className="text-xs text-muted-foreground italic">(Coming soon)</p>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Activity</h3>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Last Login</p>
                </div>
                <p className="font-semibold text-foreground">{userData.lastLogin}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total Inspections</p>
                </div>
                <p className="font-semibold text-foreground">{userData.inspections}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                </div>
                <p className="font-semibold text-foreground">{userData.reports}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Account Created</p>
                </div>
                <p className="font-semibold text-foreground">{userData.memberSince}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Field Modal */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editModal.field}</DialogTitle>
            <DialogDescription>
              Update your {editModal.field.toLowerCase()} below
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="edit-field">{editModal.field}</Label>
            <Input
              id="edit-field"
              value={editModal.value}
              onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModal({ open: false, field: "", value: "" })}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative mt-2">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative mt-2">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">Password requirements:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className={hasMinLength ? "text-green-600" : "text-muted-foreground"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasUppercase ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className={hasUppercase ? "text-green-600" : "text-muted-foreground"}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasNumber ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className={hasNumber ? "text-green-600" : "text-muted-foreground"}>
                    One number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasSpecialChar ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className={hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                    One special character
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative mt-2">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
