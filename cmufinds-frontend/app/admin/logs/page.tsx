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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { FileText, Search, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Role } from '@/types'; // Assuming Role enum is defined in @/types

interface LogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string; // Keep as string, formatting done in render
  ipAddress: string;
  roles: Role[]; // Added roles
  // logType might still be useful for filtering/styling
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch logs
  const fetchLogs = async (page = currentPage, role = roleFilter) => {
    try {
      setLoading(true);
      const params: { 
        page: number; 
        limit: number; 
        role?: string; 
        search?: string 
      } = { 
        page, 
        limit: 20 
      };
      
      if (role !== 'all') {
        params.role = role;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      console.log('Fetching logs with params:', params);
      const response = await adminAPI.getLogs(params);
      
      // Ensure role is always a string
      const processedLogs = response.data.logs.map((log: any) => ({
        ...log,
        userRole: log.userRole || 'STUDENT' // Default to STUDENT if role is missing
      }));
      
      setLogs(processedLogs);
      setTotalPages(Math.ceil(response.data.total / response.data.limit));
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to load audit logs. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, roleFilter]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs(1, roleFilter);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  // --- Helper Functions ---
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss'); }
    catch (error) { return 'Invalid Date'; }
  };

  const formatAction = (action: string): string => {
    // Simple formatting example, expand as needed
    return action
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
  };

  const renderRoleBadges = (roles: Role[]) => {
    if (!roles || roles.length === 0) {
      return <Badge variant="outline">Unknown</Badge>; // Fallback if roles array is empty
    }
    return roles.map((role, index) => (
      <Badge 
        key={index} 
        variant={role === Role.ADMIN ? "destructive" : role === Role.DEVELOPER ? "secondary" : "default"} 
        className="mr-1 mb-1 capitalize"
      >
        {role.toLowerCase()}
      </Badge>
    ));
  };

  // --- Render Logic ---
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center">
          <FileText className="mr-2 h-6 w-6" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground">
          Track system and user activity across the platform
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter and search through system logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="w-full md:w-auto">
              <label className="text-sm font-medium mb-1 block">User Role</label>
              <Select
                value={roleFilter}
                onValueChange={(value: string) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <form onSubmit={handleSearch} className="flex-1 w-full">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search username or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button type="submit" size="icon" title="Apply filters">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh logs"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <ScrollArea className="w-full overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead className="w-[100px]">Role</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="hidden md:table-cell">Action</TableHead>
                <TableHead className="hidden md:table-cell">IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ... Loading Skeleton ... */}
              {!loading && logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{renderRoleBadges(log.roles)}</TableCell>
                  <TableCell className="font-medium">{log.username}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="max-w-[300px] truncate block" title={log.action}>
                      {formatAction(log.action)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{log.ipAddress || '::1'}</TableCell>
                  <TableCell>{formatDate(log.timestamp)}</TableCell>
                </TableRow>
              ))}
              {/* ... No logs found message ... */}
            </TableBody>
          </Table>
        </ScrollArea>

        {logs.length === 0 && !loading && (
          <div className="text-center py-10 text-muted-foreground">
            No logs found. Adjust your filters or try again later.
          </div>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex justify-center mt-4 space-x-2">
        <Button
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="py-2 px-4">
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
} 