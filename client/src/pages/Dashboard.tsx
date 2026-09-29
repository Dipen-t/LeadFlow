import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FileText, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useSocket } from '../hooks/useSocket';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface DashboardMetrics {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  leadsByCategory: Record<string, number>;
  pendingDocuments: number;
  failedDocuments: number;
  overdueTasks: number;
  pendingTasks: number;
  completedTasks: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF66B2'];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socket = useSocket();

  const fetchMetricsAndStages = async () => {
    try {
      const metricsRes = await api.get('/dashboard/metrics');
      setMetrics(metricsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsAndStages();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = () => {
      fetchMetricsAndStages();
    };

    socket.on('lead.created', handleDataUpdate);
    socket.on('lead.stageChanged', handleDataUpdate);
    socket.on('lead.converted', handleDataUpdate);
    socket.on('document.verified', handleDataUpdate);
    socket.on('document.failed', handleDataUpdate);
    socket.on('task.created', handleDataUpdate);
    socket.on('task.completed', handleDataUpdate);
    socket.on('connect', handleDataUpdate);

    return () => {
      socket.off('lead.created', handleDataUpdate);
      socket.off('lead.stageChanged', handleDataUpdate);
      socket.off('lead.converted', handleDataUpdate);
      socket.off('document.verified', handleDataUpdate);
      socket.off('document.failed', handleDataUpdate);
      socket.off('task.created', handleDataUpdate);
      socket.off('task.completed', handleDataUpdate);
      socket.off('connect', handleDataUpdate);
    };
  }, [socket]);

  if (isLoading) {
    return <Loader message="Loading dashboard metrics..." />;
  }

  if (!metrics) {
    return <div className="text-red-500">Failed to load dashboard metrics.</div>;
  }

  // Prepare chart data
  const categoryData = Object.entries(metrics.leadsByCategory || {})
    .map(([status, count]) => ({ name: status, value: count }))
    .filter(d => d.value > 0);

  const taskData = [
    { name: 'Pending', count: metrics.pendingTasks },
    { name: 'Overdue', count: metrics.overdueTasks },
    { name: 'Completed', count: metrics.completedTasks },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Live snapshot of your brokerage performance.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics.wonLeads} won, {metrics.lostLeads} lost
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">Waiting on background verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overdueTasks}</div>
            <p className="text-xs text-red-500 mt-1 font-medium">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Documents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">Verification failures requiring manual review</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Lead Categories</CardTitle>
            <CardDescription>Bifurcation of leads by their status</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex justify-center items-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No leads available yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>Overview of pending, overdue, and completed tasks</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Completed' ? '#10b981' : entry.name === 'Overdue' ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
