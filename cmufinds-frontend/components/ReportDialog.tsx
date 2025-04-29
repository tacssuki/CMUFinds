'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { reportAPI } from '@/lib/api'; // Assuming your report API is here

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'POST' | 'USER';
  entityId: string;
}

// Align these values exactly with the backend ReportReason enum
const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content' }, // Corrected value
  { value: 'HARASSMENT', label: 'Harassment or Bullying' },
  { value: 'MISLEADING_INFORMATION', label: 'Misleading Information' }, // Corrected value & label
  { value: 'SCAM', label: 'Scam or Fraud' }, // Added
  { value: 'OFF_TOPIC', label: 'Off-Topic' }, // Added
  // { value: 'INFRINGEMENT', label: 'Intellectual Property Infringement' }, // Removed based on backend error
  { value: 'OTHER', label: 'Other (Please specify)' },
];

export default function ReportDialog({ isOpen, onClose, entityType, entityId }: ReportDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "Error", description: "Please select a reason.", variant: "destructive" });
      return;
    }
    if (reason === 'OTHER' && !details.trim()) {
      toast({ title: "Error", description: "Please provide details for the 'Other' reason.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // --- Call the actual API --- 
      const reportData = {
        entityType,
        entityId,
        reason, // Ensure this value matches one of the ReportReason enum values on the backend
        description: reason === 'OTHER' ? details.trim() : undefined, 
      };
      
      // Use the imported reportAPI
      const result = await reportAPI.submitReport(reportData);
      
      // Check backend response status (assuming 2xx indicates success)
      if (result.status >= 200 && result.status < 300) {
          toast({ title: "Report Submitted", description: result.message || "Thank you for your feedback. We will review it shortly." });
          handleClose(); // Close dialog on success
      } else {
         throw new Error(result.message || "Failed to submit report.");
      }
      // --- End API call --- 
      
    } catch (error: any) {
      console.error("Failed to submit report:", error);
      toast({ 
        title: "Error Submitting Report", 
        description: error.message || "An unexpected error occurred. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when dialog closes
  const handleClose = () => {
    setReason('');
    setDetails('');
    onClose(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}> 
      <DialogContent className="sm:max-w-[425px] dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">Report {entityType === 'POST' ? 'Post' : 'User'}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Please select a reason for reporting this {entityType.toLowerCase()} and provide details if necessary.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right dark:text-gray-300">
              Reason
            </Label>
            <Select value={reason} onValueChange={setReason} >
              <SelectTrigger id="reason" className="col-span-3 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:focus:ring-offset-gray-900">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200">
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="dark:focus:bg-gray-700">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(reason === 'OTHER' || details) && ( // Show details if 'OTHER' is selected or if details are already entered
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="details" className="text-right dark:text-gray-300">
                Details
              </Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={reason === 'OTHER' ? "Please specify why you are reporting..." : "(Optional) Provide additional details..."}
                className="col-span-3 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:ring-offset-gray-900"
                rows={4}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !reason || (reason === 'OTHER' && !details.trim())}
            className="dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 