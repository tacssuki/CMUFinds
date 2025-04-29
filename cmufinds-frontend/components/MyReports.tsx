"use client";

import { useState, useEffect } from "react";
import { reportAPI } from "@/lib/api";
import { AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useGlobalChatDrawer } from "@/store/globalChatDrawerStore";

interface Report {
  id: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  postId?: string;
  threadId?: string;
  post?: {
    id: string;
    title: string;
  };
}

export default function MyReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { openChatDrawer } = useGlobalChatDrawer();

  const fetchReports = async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const response = await reportAPI.getMyReports({ 
        page: pageNum, 
        limit: 10 
      });
      
      setReports(response.data.data || []);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Could not load your reports. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(page);
  }, [page]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-secondary/30 text-primary';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatReportType = (type: string) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleOpenChat = (e: React.MouseEvent, threadId?: string) => {
    e.preventDefault();
    if (threadId) {
      openChatDrawer();
    }
  };

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading reports...</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-background shadow-sm">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="mt-2 text-lg font-medium text-primary">No reports</h3>
        <p className="text-muted-foreground">You haven't filed any reports yet.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-primary">My Reports</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Related Item
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm">{formatReportType(report.type)}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-foreground truncate max-w-xs">
                    {report.reason}
                  </p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(report.status)}`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {report.post ? (
                    <Link 
                      href={`/posts/${report.post.id}`} 
                      className="text-primary hover:text-primary/80 flex items-center text-sm transition-colors"
                    >
                      <span className="truncate max-w-[120px]">{report.post.title}</span>
                      <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                    </Link>
                  ) : report.threadId ? (
                    <button 
                      onClick={(e) => handleOpenChat(e, report.threadId)}
                      className="text-primary hover:text-primary/80 flex items-center text-sm transition-colors"
                    >
                      <span>Chat Thread</span>
                      <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t flex justify-center">
          <div className="flex space-x-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className={`px-3 py-1 rounded ${
                page === 1 || isLoading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              }`}
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-muted rounded">
              {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className={`px-3 py-1 rounded ${
                page === totalPages || isLoading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 