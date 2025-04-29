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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Eye, CheckSquare, RefreshCw } from 'lucide-react'; // Icons
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select
import ChatHistoryModal from '@/components/ChatHistoryModal'; // Import the new modal

// Define Report interface (match backend Prisma model + included data)
interface ReportUser {
  id: string;
  name?: string | null;
  username?: string | null;
}

interface ReportPost {
  id: string;
  title?: string | null;
  description?: string | null;
  userId?: string | null;
  user?: ReportUser | null;
}

interface Report {
  id: string;
  type: 'POST' | 'USER';
  reason: string;
  status: 'PENDING' | 'REVIEWING' | 'ACTION_TAKEN' | 'DISMISSED';
  createdAt: string;
  reporterId: string;
  reportedPostId?: string | null;
  reportedUserId?: string | null;
  description?: string | null;
  adminNotes?: string | null;

  // Correct Included data definitions
  reporter?: ReportUser | null;
  reportedPost?: ReportPost | null;
  reportedUser?: ReportUser | null;
}

// Define ChatMessage interface locally
interface ChatMessage {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  senderId: string;
  sender?: { user: ReportUser }; // Use ReportUser type defined above
  isSystemMessage?: boolean;
}

// Define possible resolution statuses using 'as const' for strong typing
const RESOLUTION_STATUSES = [
  { value: 'DISMISSED', label: 'Dismiss Report' },
  { value: 'ACTION_TAKEN', label: 'Action Taken (e.g., remove post, suspend user)' },
] as const; // Add 'as const' here

// Define the type for the status based on the const array values
type ResolutionStatus = typeof RESOLUTION_STATUSES[number]['value'];

export default function ReportManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Dialog states
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveStatus, setResolveStatus] = useState<ResolutionStatus>(RESOLUTION_STATUSES[0].value); // Default to first valid status
  const [adminNotes, setAdminNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false); // Loading state for resolve action

  // Chat History Modal State
  const [isChatHistoryModalOpen, setIsChatHistoryModalOpen] = useState(false);
  const [chatHistoryUsers, setChatHistoryUsers] = useState<{ user1: ReportUser | null, user2: ReportUser | null }>({ user1: null, user2: null });
  const [chatHistoryMessages, setChatHistoryMessages] = useState<ChatMessage[]>([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null); // Store thread ID if needed

  // --- Data Fetching ---
  const fetchReports = async (page = currentPage) => {
        setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getReports({ page, limit: 10 });
      setReports(response.data?.reports || []);
      setTotalPages(Math.ceil((response.data?.total || 0) / (response.data?.limit || 10)));
      } catch (err) {
        setError('Failed to load reports. Please try again later.');
      toast({ title: "Error", description: "Failed to load reports.", variant: "destructive" });
      console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      setRefreshing(false);
      }
    };

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  // --- Handlers ---
  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports(1); // Go back to page 1 on refresh
    setCurrentPage(1);
  };

  const handleViewDetails = async (report: Report) => {
    setSelectedReport(report); // Set basic data first
    setIsDetailsDialogOpen(true);
    // Fetch full details
    try {
      const response = await adminAPI.getReportDetails(report.id);
      setSelectedReport(response.data.data); // Update with full details
    } catch (err) {
      toast({ title: "Error", description: "Could not load full report details.", variant: "destructive" });
       console.error("Error fetching report details:", err);
      // Keep dialog open with basic details if fetch fails
    }
  };

  const handleOpenResolveDialog = (report: Report) => {
    setSelectedReport(report);
    setResolveStatus(RESOLUTION_STATUSES[0].value); // Reset to default status
    setAdminNotes(report.adminNotes || ''); // Pre-fill notes if they exist
    setIsResolving(false); // Reset loading state
    setIsResolveDialogOpen(true);
  };

  const handleConfirmResolve = async () => {
    if (!selectedReport || !resolveStatus) return;
    setIsResolving(true);
    try {
      // Pass the correctly typed resolveStatus
      await adminAPI.resolveReport(selectedReport.id, resolveStatus, adminNotes.trim() || undefined);
      toast({ title: "Success", description: `Report status updated to ${resolveStatus}.` });
      setIsResolveDialogOpen(false);
      fetchReports(currentPage); // Refresh list
    } catch (err: any) {
       toast({ title: "Error", description: err.response?.data?.message || "Failed to resolve report.", variant: "destructive" });
       console.error("Error resolving report:", err);
    } finally {
      setIsResolving(false);
    }
  };

  // Handler to fetch and open chat history modal
  const handleViewChatHistory = async () => {
    if (!selectedReport || !selectedReport.reporter || !selectedReport.reportedUser) {
      toast({ title: "Error", description: "Cannot view chat history. Missing reporter or reported user information.", variant: "destructive" });
      return;
    }
    if (chatHistoryLoading) return;

    setChatHistoryLoading(true);
    setIsChatHistoryModalOpen(true); 
    setChatHistoryMessages([]); 
    setChatHistoryUsers({ user1: selectedReport.reporter, user2: selectedReport.reportedUser });
    setChatThreadId(null); 

    try {
      const reporterId = selectedReport.reporterId;
      const reportedUserId = selectedReport.reportedUserId;

      if (!reporterId || !reportedUserId) {
        throw new Error("Reporter ID or Reported User ID is missing.");
      }
      
      // Use adminAPI to get threads
      const threadsResult = await adminAPI.getThreadsBetweenUsers(reporterId, reportedUserId);

      if (threadsResult.status === 200 && threadsResult.data && threadsResult.data.length > 0) {
        const firstThread = threadsResult.data[0]; 
        setChatThreadId(firstThread.id);
        
        // Fetch full messages for this specific thread (assuming an endpoint exists or needs adding)
        // This part is also a placeholder/assumption
        try {
          // Use adminAPI here, not chatAPI
          const messagesResponse = await adminAPI.getMessagesForThread(firstThread.id); 
          // Ensure messages are correctly typed as ChatMessage[]
          const fetchedMessages: ChatMessage[] = messagesResponse.data || []; 
          setChatHistoryMessages(fetchedMessages);
        } catch (msgError) {
           console.error("Error fetching full messages for thread:", firstThread.id, msgError);
           toast({ title: "Warning", description: "Could not load full message history for the thread.", variant: "default" });
           setChatHistoryMessages([]); // Show empty on error fetching messages
        }

      } else if (threadsResult.status === 404) {
         setChatHistoryMessages([]);
         toast({ title: "Not Found", description: "No chat history found between these users.", variant: "default" });
      } else {
         throw new Error(threadsResult.message || "Failed to fetch chat history.");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load chat history.", variant: "destructive" });
      console.error("Error fetching chat history:", err);
    } finally {
      setChatHistoryLoading(false);
    }
  };

  // --- Helper Functions ---
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'MMM d, yyyy HH:mm'); }
    catch (error) { return 'Invalid Date'; }
  };

  const renderStatusBadge = (status: Report['status']) => {
     switch (status) {
      case 'PENDING': return <Badge variant="secondary">Pending</Badge>;
      case 'REVIEWING': return <Badge variant="outline">Reviewing</Badge>;
      case 'ACTION_TAKEN': return <Badge variant="destructive">Action Taken</Badge>;
      case 'DISMISSED': return <Badge variant="outline">Dismissed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
  }
  };

  // --- Render Logic ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold tracking-tight">Reports Management</h1>
         <Button onClick={handleRefresh} variant="outline" size="icon" disabled={refreshing}>
           <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
         </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-md">
          {error}
        </div>
      )}

      <Card>
         <CardHeader>
          <CardTitle>Report Queue</CardTitle>
          <CardDescription>Review user reports regarding posts or chat messages.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Reason</TableHead>
                  <TableHead>Reporter Name</TableHead> {/* Changed Header */}
                  <TableHead>Reported Entity</TableHead> {/* Added Header */}
            <TableHead>Status</TableHead>
                    <TableHead>Reported At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
                  {loading && reports.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">Loading reports...</TableCell></TableRow>
                  )}
                  {!loading && reports.length === 0 && (
                     <TableRow><TableCell colSpan={6} className="text-center h-24">No pending reports found.</TableCell></TableRow>
                  )}
          {reports.map((report) => (
            <TableRow key={report.id}>
                      <TableCell><Badge variant={report.type === 'POST' ? 'default' : 'secondary'}>{report.type}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate" title={report.reason}>{report.reason}</TableCell>
                    {/* Display Reporter Name */}
                    <TableCell className="max-w-[150px] truncate" title={report.reporter?.name || report.reporter?.username || report.reporterId}>
                      {report.reporter?.name || report.reporter?.username || report.reporterId}
                    </TableCell>
                    {/* Display Reported Entity */}
                    <TableCell className="max-w-[250px] truncate">
                      {report.type === 'POST' && report.reportedPost ? (
                        <span title={`Post: ${report.reportedPost.title} (by ${report.reportedPost.user?.name || report.reportedPost.user?.username || 'Unknown'})`}>
                          Post: {report.reportedPost.title} <span className="text-xs text-muted-foreground">(by {report.reportedPost.user?.name || report.reportedPost.user?.username || 'Unknown'})</span>
                        </span>
                      ) : report.type === 'USER' && report.reportedUser ? (
                        <span title={`User: ${report.reportedUser.name || report.reportedUser.username || report.reportedUserId}`}>
                          User: {report.reportedUser.name || report.reportedUser.username || report.reportedUserId}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
              <TableCell>{renderStatusBadge(report.status)}</TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell className="text-right">
                         <div className="flex space-x-1 justify-end">
                           <Button variant="ghost" size="icon" onClick={() => handleViewDetails(report)} title="View Details">
                             <Eye className="h-4 w-4" />
                           </Button>
                         {/* Only allow resolving PENDING or REVIEWING reports */}
                         {(report.status === 'PENDING' || report.status === 'REVIEWING') && (
                              <Button variant="ghost" size="icon" onClick={() => handleOpenResolveDialog(report)} title="Resolve Report">
                                <CheckSquare className="h-4 w-4" />
                  </Button>
                )}
                         </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
       {!loading && reports.length > 0 && totalPages > 1 && (
      <div className="flex justify-center mt-4 space-x-2">
           <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1 || loading}>Previous</Button>
           <span className="py-2 px-4">Page {currentPage} of {totalPages}</span>
           <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || loading}>Next</Button>
         </div>
       )}

        {/* View Report Details Dialog - Update Content */}
       <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader><DialogTitle>Report Details</DialogTitle></DialogHeader>
           {selectedReport ? (
             <ScrollArea className="max-h-[70vh]">
               <div className="space-y-4 p-4">
                 <p><Label>Report ID:</Label> {selectedReport.id}</p>
                 <p><Label>Type:</Label> {selectedReport.type}</p>
                 <p><Label>Status:</Label> {renderStatusBadge(selectedReport.status)}</p>
                 <p><Label>Reason:</Label> {selectedReport.reason}</p>
                 {selectedReport.description && <p><Label>Description:</Label> {selectedReport.description}</p>}
                 <p><Label>Reported At:</Label> {formatDate(selectedReport.createdAt)}</p>
                 <p><Label>Reporter:</Label> {selectedReport.reporter?.name || selectedReport.reporter?.username} ({selectedReport.reporterId})</p>
               
                 {/* --- Reported Post Details --- */}
                 {selectedReport.type === 'POST' && selectedReport.reportedPost && (
                 <Card className="mt-4">
                     <CardHeader><CardTitle className="text-base">Reported Post Details</CardTitle></CardHeader>
                     <CardContent className="space-y-2 text-sm">
                       <p><Label>Post ID:</Label> {selectedReport.reportedPostId}</p>
                       <p><Label>Title:</Label> {selectedReport.reportedPost.title || 'N/A'}</p>
                       <p><Label>Author:</Label> {selectedReport.reportedPost.user?.name || selectedReport.reportedPost.user?.username || 'Unknown'} ({selectedReport.reportedPost.userId})</p>
                       {selectedReport.reportedPost.description && (
                         <div>
                           <Label>Description:</Label>
                           <p className="whitespace-pre-wrap p-2 border rounded bg-muted/50">{selectedReport.reportedPost.description}</p>
                         </div>
                       )}
                   </CardContent>
                 </Card>
               )}
               
                 {/* --- Reported User Details --- */}
                 {selectedReport.type === 'USER' && selectedReport.reportedUser && (
                 <Card className="mt-4">
                     <CardHeader><CardTitle className="text-base">Reported User Details</CardTitle></CardHeader>
                     <CardContent className="space-y-2 text-sm">
                       <p><Label>User ID:</Label> {selectedReport.reportedUserId}</p>
                       <p><Label>Name:</Label> {selectedReport.reportedUser.name || selectedReport.reportedUser.username || 'Unknown'}</p>
                       <Button 
                         size="sm" 
                         variant="outline" 
                         onClick={handleViewChatHistory} 
                         disabled={chatHistoryLoading} // Disable while loading
                         className="mt-2"
                       >
                         {chatHistoryLoading ? "Loading Chat..." : "View Chat History"}
                       </Button>
                   </CardContent>
                 </Card>
               )}

                 {/* Display Admin Notes if available */}
                 {selectedReport.adminNotes && (
                   <div className="mt-4">
                      <Label>Admin Notes:</Label>
                     <p className="whitespace-pre-wrap p-2 border rounded bg-muted/50 text-sm">{selectedReport.adminNotes}</p>
                   </div>
                 )}
      </div>
             </ScrollArea>
           ) : (
             <p>Loading details...</p>
           )}
           <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
              {/* Optionally add resolve buttons here too? */}
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Resolve Report Dialog - Updated */}
       <Dialog open={isResolveDialogOpen} onOpenChange={(open) => !isResolving && setIsResolveDialogOpen(open)}> {/* Prevent closing while resolving */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
             <DialogDescription>Review and set the final status for report ID: {selectedReport?.id}</DialogDescription>
          </DialogHeader>
           <div className="py-4 space-y-4">
             <div>
               <Label htmlFor="resolve-status">Resolution Status</Label>
               <Select 
                 value={resolveStatus} 
                 onValueChange={(value: string) => setResolveStatus(value as ResolutionStatus)}
                 disabled={isResolving}
               >
                 <SelectTrigger id="resolve-status">
                   <SelectValue placeholder="Select resolution status" />
                 </SelectTrigger>
                 <SelectContent>
                   {RESOLUTION_STATUSES.map(s => (
                     <SelectItem key={s.value} value={s.value}>
                       {s.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             <div>
                <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                <Textarea 
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any internal notes regarding the resolution..."
                  rows={4}
                  className="mt-1"
                  disabled={isResolving}
                />
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)} disabled={isResolving}>Cancel</Button>
             <Button onClick={handleConfirmResolve} disabled={isResolving || !resolveStatus}>
               {isResolving ? "Resolving..." : "Confirm Resolution"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat History Modal - Render Conditionally */}
      <ChatHistoryModal 
        isOpen={isChatHistoryModalOpen}
        onClose={() => setIsChatHistoryModalOpen(false)}
        user1={chatHistoryUsers.user1}
        user2={chatHistoryUsers.user2}
        messages={chatHistoryMessages}
        threadId={chatThreadId}
        loading={chatHistoryLoading}
      />

    </div>
  );
} 