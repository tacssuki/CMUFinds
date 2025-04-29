'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CircleUser, FileQuestion, AlertCircle, CheckCircle2, Users, Flag, Clock, BarChart3 } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  lostCount: number;
  foundCount: number;
  matchedCount: number;
  resolvedCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getStats();
        setStats(response.data);
      } catch (err) {
        setError('Failed to load statistics. Please try again later.');
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-md">
        <h3 className="font-medium text-destructive">Error Loading Data</h3>
        <p className="text-destructive-foreground">{error}</p>
      </div>
    );
  }

  // Calculate derived statistics
  const resolutionRate = stats?.totalPosts && stats.totalPosts > 0 
    ? ((stats.resolvedCount / stats.totalPosts) * 100).toFixed(2) 
    : "0";
  
  const matchRate = stats?.totalPosts && stats.totalPosts > 0 
    ? ((stats.matchedCount / stats.totalPosts) * 100).toFixed(2) 
    : "0";
  
  const lostVsFoundRatio = stats?.foundCount && stats.foundCount > 0 
    ? (stats.lostCount / stats.foundCount).toFixed(2) 
    : "N/A";

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: <CircleUser className="h-8 w-8 text-blue-600" />,
      description: 'Registered accounts',
      color: 'bg-blue-50 border-blue-100',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Total Posts',
      value: stats?.totalPosts || 0,
      icon: <FileQuestion className="h-8 w-8 text-purple-600" />,
      description: 'Lost & found items',
      color: 'bg-purple-50 border-purple-100',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Lost Items',
      value: stats?.lostCount || 0,
      icon: <AlertCircle className="h-8 w-8 text-amber-600" />,
      description: 'Items reported lost',
      color: 'bg-amber-50 border-amber-100',
      iconBg: 'bg-amber-100',
    },
    {
      title: 'Found Items',
      value: stats?.foundCount || 0,
      icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
      description: 'Items reported found',
      color: 'bg-green-50 border-green-100',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Matched',
      value: stats?.matchedCount || 0,
      icon: <CheckCircle2 className="h-8 w-8 text-emerald-600" />,
      description: 'Potential matches',
      color: 'bg-emerald-50 border-emerald-100',
      iconBg: 'bg-emerald-100',
    },
    {
      title: 'Resolved',
      value: stats?.resolvedCount || 0,
      icon: <CheckCircle2 className="h-8 w-8 text-teal-600" />,
      description: 'Successfully returned',
      color: 'bg-teal-50 border-teal-100',
      iconBg: 'bg-teal-100',
    },
  ];

  // Derived stats cards
  const derivedStats = [
    {
      title: 'Resolution Rate',
      value: `${resolutionRate}%`,
      description: 'Percentage of posts that have been resolved',
      color: 'border-blue-200',
    },
    {
      title: 'Match Rate',
      value: `${matchRate}%`,
      description: 'Percentage of posts that have been matched',
      color: 'border-purple-200',
    },
    {
      title: 'Lost to Found Ratio',
      value: lostVsFoundRatio,
      description: 'Ratio of lost items to found items',
      color: 'border-amber-200',
    },
  ];

  // Admin quick actions
  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage accounts, roles, and permissions',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      href: '/admin/users',
      color: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
    },
    {
      title: 'Reports Queue',
      description: 'Handle reported content and issues',
      icon: <Flag className="h-6 w-6 text-rose-600" />,
      href: '/admin/reports',
      color: 'border-rose-200 hover:border-rose-300 hover:bg-rose-50',
    },
    {
      title: 'Audit Logs',
      description: 'Track system and user activities',
      icon: <Clock className="h-6 w-6 text-slate-600" />,
      href: '/admin/logs',
      color: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the CMUFinds system statistics and quick navigation.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className={`border ${card.color} overflow-hidden`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div>
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <CardDescription className="text-xs mt-1">{card.description}</CardDescription>
              </div>
              <div className={`p-2 rounded-full ${card.iconBg}`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Derived Statistics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {derivedStats.map((stat, index) => (
            <Card key={index} className={`border ${stat.color}`}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className={`border ${action.color} transition-all hover:shadow-md cursor-pointer`}>
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="p-2 rounded-full bg-white shadow-sm">
                    {action.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">{action.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">{action.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 