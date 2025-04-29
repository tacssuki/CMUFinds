"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { userAPI } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Eye, EyeOff, Upload, Save, Edit } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import zxcvbn from "zxcvbn"
import { AvatarUpload } from "@/components/ui/avatar-upload"
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
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(100),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, user, updateUser } = useAuthStore()
  
  // UI states
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [emailUsername, setEmailUsername] = useState("")
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false)

  // Password functions for strength checking
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    const result = zxcvbn(password);
    setPasswordStrength(result.score);
  };

  // Get password strength text
  const getStrengthText = (score: number) => {
    switch (score) {
      case 0: return "Very Weak";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "Very Weak";
    }
  };

  // Get strength color
  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0: return "bg-destructive";
      case 1: return "bg-destructive";
      case 2: return "bg-orange-500";
      case 3: return "bg-yellow-500";
      case 4: return "bg-green-500";
      default: return "bg-destructive";
    }
  };

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  })

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // Watch password field for strength calculation
  const newPassword = passwordForm.watch("newPassword");
  useEffect(() => {
    checkPasswordStrength(newPassword);
  }, [newPassword]);

  // Fetch user profile data
  useEffect(() => {
    if (!isAuthenticated) return
    fetchProfileData()
  }, [isAuthenticated])

  const fetchProfileData = async () => {
    setIsLoading(true)
    try {
      const response = await userAPI.getProfile()
      const fetchedUserData = response.data.data || response.data.user
      
      if (fetchedUserData) {
        setUserData(fetchedUserData)
        
        // Extract the username portion of the email
        const email = fetchedUserData.email || '';
        const username = email.includes('@') ? email.split('@')[0] : email;
        setEmailUsername(username);
        
        profileForm.reset({
          name: fetchedUserData.name || '',
        })
      } else {
        toast({
          title: "Error",
          description: "Could not load profile data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Could not load your profile. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle profile form submission
  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsSavingProfile(true)
    try {
      await userAPI.updateProfile(data)
      
      // Update user in auth store
      updateUser({
        name: data.name,
      })
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
      
      // Exit edit mode after successful update
      setIsEditNameDialogOpen(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle password form submission
  const onSubmitPassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    try {
      await userAPI.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
      
      // Reset password form
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error changing password:", error)
      toast({
        title: "Error",
        description: "Could not change your password. Please verify your current password and try again.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      await userAPI.uploadProfilePicture(file)
      
      // Re-fetch profile data to update the authStore with the new URL
      await fetchProfileData() 
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully."
      })
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadingImage(false)
    }
  }

  // Add handler to open edit name dialog
  const handleEditNameClick = () => {
    profileForm.reset({ name: userData?.name || '' }); // Reset form with current name
    setIsEditNameDialogOpen(true);
  };

  // Add handler for deleting account
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      // await userAPI.deleteAccount() // Assumes this API endpoint exists - Uncomment when implemented
      console.log("Simulating account deletion..."); // Placeholder

      // Log the user out and redirect to login
      useAuthStore.getState().logout()
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      })
      router.push('/login') 
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: (error as any)?.response?.data?.message || "Could not delete your account. Please try again.",
        variant: "destructive",
      })
      setIsDeletingAccount(false) // Only reset on error
    }
    // No need to reset on success as we navigate away
  }

  // Show loading state while checking auth
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button
        variant="link"
        className="flex items-center mb-6 pl-0 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-6">
        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Profile</CardTitle>
            <CardDescription>
              Manage your account settings and preferences
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Profile Picture */}
              <AvatarUpload 
                currentImage={user?.profilePictureUrl}
                fallbackText={user?.name?.charAt(0) || "U"}
                onImageChange={handleProfilePictureUpload}
                size="lg"
                className="mb-4"
                placeholderImageSrc="/placeholders/user.png"
              />
              
              {/* User Info */}
              <div className="flex-1 space-y-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-foreground">{user?.name || profileForm.getValues('name') || "FULLNAME HERE"}</h2>
                <p className="text-muted-foreground mt-2">Joined Date: {userData?.createdAt || user?.createdAt ? new Date(userData?.createdAt || user?.createdAt!).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : "(Loading...)"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="account">Account Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Account Info Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your personal information and contact details
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading profile...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Display Name with Edit Button */}
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <div className="flex items-center justify-between">
                        <p className="text-foreground">{userData?.name || "(Not set)"}</p>
                        <Button variant="ghost" size="icon" onClick={handleEditNameClick} aria-label="Edit Name">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Display Email (Read-only) */}
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">{userData?.email || "(Not set)"}</p>
                      <p className="text-xs text-muted-foreground">
                        Your email address is linked to your account and cannot be changed.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        {...passwordForm.register("currentPassword")}
                        placeholder="Enter your current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">{showCurrentPassword ? 'Hide' : 'Show'} current password</span>
                      </Button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        {...passwordForm.register("newPassword")}
                        placeholder="Enter your new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">{showNewPassword ? 'Hide' : 'Show'} new password</span>
                      </Button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                          <div 
                            className={`h-full ${getStrengthColor(passwordStrength)}`} 
                            style={{ width: `${(passwordStrength + 1) * 20}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Password strength: <span className="font-medium">{getStrengthText(passwordStrength)}</span>
                        </p>
                      </div>
                    )}
                    
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...passwordForm.register("confirmPassword")}
                        placeholder="Confirm your new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">{showConfirmPassword ? 'Hide' : 'Show'} confirmation password</span>
                      </Button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? "Updating Password..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Danger Zone Section */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanent actions that cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Delete Account</h3>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeletingAccount}>
                    {isDeletingAccount ? "Deleting..." : "Delete Account"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account,
                      your posts, chat history, and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? "Deleting Account..." : "Yes, delete my account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Add Edit Name Dialog --- */}
      <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Full Name</DialogTitle>
            <DialogDescription>
              Update your displayed name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="dialog-name">Full Name</Label>
              <Input
                id="dialog-name"
                 {...profileForm.register("name")}
                 placeholder="Your full name"
               />
               {profileForm.formState.errors.name && (
                 <p className="text-sm text-destructive">
                   {profileForm.formState.errors.name.message}
                 </p>
               )}
             </div>
             <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsEditNameDialogOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={isSavingProfile}>
                 {isSavingProfile ? "Saving..." : "Save Name"}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>

    </div>
  )
}