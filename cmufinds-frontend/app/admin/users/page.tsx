'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Trash2, Shield, AlertTriangle, RefreshCw, RotateCcw, KeyIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define the user type (include deletedAt)
interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  roles: string[];
  createdAt: string;
  ipAddress?: string;
  deletedAt?: string | null; // Added for soft delete tracking
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletedTotalPages, setDeletedTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('active');
  const { toast } = useToast();
  
  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // State for role editing
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // State for profile editing
  const [editFormData, setEditFormData] = useState({ name: '', email: '' });

  // Available roles
  const availableRoles = ['STUDENT', 'ADMIN', 'DEVELOPER'];

  // --- Data Fetching ---
  const fetchUsers = async (page: number, includeDeleted: boolean) => {
        setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getUsers({ page, limit: 10, includeDeleted });
      const fetchedUsers = response.data.users || []; // Ensure users is an array
      const total = response.data.total || 0;
      const limit = response.data.limit || 10;

      if (includeDeleted) {
        // Filter users with deletedAt set for the deleted tab
        setDeletedUsers(fetchedUsers.filter((u: User) => u.deletedAt));
        setDeletedTotalPages(Math.ceil(total / limit)); 
      } else {
        // Filter users without deletedAt for the active tab
        setUsers(fetchedUsers.filter((u: User) => !u.deletedAt));
        setTotalPages(Math.ceil(total / limit));
      }
      } catch (err) {
      const errorMsg = `Failed to load ${includeDeleted ? 'deleted' : 'active'} users.`;
      setError(errorMsg);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      console.error(`Error fetching ${includeDeleted ? 'deleted' : 'active'} users:`, err);
      } finally {
        setLoading(false);
      }
    };

  // Fetch users based on the active tab
  useEffect(() => {
    if (activeTab === 'active') {
      fetchUsers(currentPage, false);
    } else {
      fetchUsers(deletedPage, true);
    }
  }, [currentPage, deletedPage, activeTab]);

  // --- Handlers ---
  
  // Edit Roles Dialog
  const handleEditRoles = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles([...user.roles]);
    setIsRoleDialogOpen(true);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) => 
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    try {
      await adminAPI.updateUserRoles(selectedUser.id, selectedRoles);
      toast({ title: "Success", description: "User roles updated." });
      setIsRoleDialogOpen(false);
      fetchUsers(currentPage, false); // Refetch active users
    } catch (err) {
      toast({ title: "Error", description: "Failed to update roles.", variant: "destructive" });
      console.error('Error updating user roles:', err);
    }
  };

  // Edit Profile Dialog
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({ name: user.name, email: user.email });
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveUserEdit = async () => {
    if (!selectedUser) return;
    try {
      await adminAPI.updateUserProfile(selectedUser.id, editFormData);
      toast({ title: "Success", description: "User profile updated." });
      setIsEditDialogOpen(false);
      fetchUsers(currentPage, false); // Refetch active users
    } catch (err: any) {
       toast({ 
        title: "Error", 
        description: err.response?.data?.message || "Failed to update profile.", 
        variant: "destructive" 
      });
      console.error('Error updating user profile:', err);
    }
  };

  // Delete User Dialog (Soft Delete Confirmation)
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    try {
      // Use deactivateUser which now performs soft delete
      await adminAPI.deactivateUser(selectedUser.id); 
      toast({ title: "Success", description: "User deactivated." });
      setIsDeleteDialogOpen(false);
      // Refetch both lists as user moves from active to deleted
      fetchUsers(currentPage, false); 
      fetchUsers(deletedPage, true);
    } catch (err) {
      toast({ title: "Error", description: "Failed to deactivate user.", variant: "destructive" });
      console.error('Error deactivating user:', err);
    }
  };

  // Restore User
  const handleRestoreUser = async (userId: string) => {
    // Find the user to get their name for the dialog
    const userToRestore = deletedUsers.find(u => u.id === userId);
    if (userToRestore) {
      setSelectedUser(userToRestore);
      setIsRestoreDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Could not find user to restore.", variant: "destructive" });
    }
  };

  // --- Add confirmation handler for restore --- 
  const handleConfirmRestore = async () => {
    if (!selectedUser) return;
    const userId = selectedUser.id;
    setIsRestoreDialogOpen(false); // Close dialog first

    try {
      await adminAPI.restoreUser(userId);
      toast({ title: "Success", description: "User restored." });
      // Refetch both lists as user moves from deleted to active
      fetchUsers(currentPage, false);
      fetchUsers(deletedPage, true);
    } catch (err) {
      toast({ title: "Error", description: "Failed to restore user.", variant: "destructive" });
      console.error('Error restoring user:', err);
    } finally {
        setSelectedUser(null); // Clear selected user
    }
  };

  // Reset Password Dialog
  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setIsResetDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedUser) return;
    try {
      const response = await adminAPI.resetUserPassword(selectedUser.id);
      toast({ title: "Success", description: response.data.message || "Password reset successfully." });
      setIsResetDialogOpen(false);
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.response?.data?.message || "Failed to reset password.", 
        variant: "destructive" 
      });
      console.error('Error resetting password:', err);
    }
  };
  
  // --- Helper Functions ---
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return 'Invalid Date';
    }
  };

  // --- Render Logic ---
  const renderUserTable = (userList: User[], isDeletedTab: boolean) => {
    if (loading && userList.length === 0) {
    return (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

    if (!loading && userList.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          No {isDeletedTab ? 'deleted' : 'active'} users found.
        </div>
      );
  }

  return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
            <TableHead>{isDeletedTab ? 'Deleted At' : 'Created At'}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
          {userList.map((user) => (
                <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                {user.roles?.map((role) => (
                  <Badge key={role} variant="secondary" className="mr-1">
                          {role}
                        </Badge>
                )) ?? 'No Roles'}
                  </TableCell>
              <TableCell>{formatDate(isDeletedTab ? user.deletedAt : user.createdAt)}</TableCell>
                  <TableCell>
                <div className="flex space-x-1">
                  {isDeletedTab ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRestoreUser(user.id)}
                      title="Restore User"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        title="Edit Profile"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditRoles(user)}
                        title="Edit Roles"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleResetPassword(user)}
                        title="Reset Password"
                      >
                        <KeyIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteUser(user)}
                        title="Deactivate User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
    );
  };

  // Main component return
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
      
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="deleted">Deleted Users</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {renderUserTable(users, false)}
          {/* Pagination for Active Users */}
          {!loading && users.length > 0 && totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <span className="py-2 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
          )}
        </TabsContent>
        <TabsContent value="deleted" className="mt-4">
          {renderUserTable(deletedUsers, true)}
           {/* Pagination for Deleted Users */}
           {!loading && deletedUsers.length > 0 && deletedTotalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                variant="outline"
                onClick={() => setDeletedPage((prev) => Math.max(prev - 1, 1))}
                 disabled={deletedPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {deletedPage} of {deletedTotalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setDeletedPage((prev) => Math.min(prev + 1, deletedTotalPages))}
                 disabled={deletedPage === deletedTotalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Roles Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roles for {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Select the roles this user should have.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
              {availableRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={`role-${role}`}>{role}</Label>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoles}>Save Roles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile for {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Update the user's name and email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div>
               <Label htmlFor="edit-name">Name</Label>
              <Input 
                id="edit-name" 
                 name="name" 
                 value={editFormData.name} 
                 onChange={handleEditFormChange} 
              />
            </div>
             <div>
               <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                 name="email" 
                type="email" 
                 value={editFormData.email} 
                 onChange={handleEditFormChange} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUserEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Corrected AlertDialog for Delete Confirmation --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        {/* Trigger is handled programmatically by onClick={handleDeleteUser} which sets isDeleteDialogOpen to true */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the user "{selectedUser?.username}"? 
              Their roles will be removed, and they will be marked for deletion. They can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Corrected AlertDialog for Reset Password Confirmation --- */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        {/* Trigger is handled programmatically by onClick={handleResetPassword} which sets isResetDialogOpen to true */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for "{selectedUser?.username}"? 
              Their password will be set to their username ({selectedUser?.username}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReset}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Corrected AlertDialog for Restore User Confirmation --- */}
      <AlertDialog 
        open={isRestoreDialogOpen} 
        onOpenChange={(open) => { 
          if (!open) setSelectedUser(null); // Clear user when closing
          setIsRestoreDialogOpen(open); 
        }}
      >
        {/* Trigger is handled programmatically by onClick={handleRestoreUser} which sets isRestoreDialogOpen to true */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore User?</AlertDialogTitle>
            {/* Use AlertDialogDescription here */}
            <AlertDialogDescription>
              Are you sure you want to restore the user "{selectedUser?.username}"? 
              They will become an active user again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
} 