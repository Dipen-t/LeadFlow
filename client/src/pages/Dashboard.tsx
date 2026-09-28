import { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { useSocket } from '../hooks/useSocket';

interface DashboardMetrics {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  leadsByStage: Record<string, number>;
  pendingDocuments: number;
  failedDocuments: number;
  overdueTasks: number;
}

interface Stage {
  _id: string;
  name: string;
  order: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socket = useSocket();

  const fetchMetricsAndStages = async () => {
    try {
      const [metricsRes, stagesRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/pipeline/stages')
      ]);
      setMetrics(metricsRes.data.data);
      setStages(stagesRes.data.data.stages);
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
      // Re-fetch metrics whenever relevant events occur
      fetchMetricsAndStages();
    };

    // Listen for pipeline events
    socket.on('lead.created', handleDataUpdate);
    socket.on('lead.stageChanged', handleDataUpdate);
    socket.on('lead.converted', handleDataUpdate);
    
    // Listen for document events
    socket.on('document.verified', handleDataUpdate);
    socket.on('document.failed', handleDataUpdate);
    
    // Re-fetch to ensure sync after reconnects
    socket.on('connect', handleDataUpdate);

    return () => {
      socket.off('lead.created', handleDataUpdate);
      socket.off('lead.stageChanged', handleDataUpdate);
      socket.off('lead.converted', handleDataUpdate);
      socket.off('document.verified', handleDataUpdate);
      socket.off('document.failed', handleDataUpdate);
      socket.off('connect', handleDataUpdate);
    };
  }, [socket]);

  if (isLoading) {
    return <Loader message="Loading dashboard metrics..." />;
  }

  if (!metrics) {
    return <div className="text-red-500">Failed to load dashboard metrics.</div>;
  }

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

      {/* Pipeline Stages Breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Pipeline Distribution</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(metrics.leadsByStage || {}).map(([stageId, count]) => {
            const stageName = stages.find(s => s._id === stageId)?.name || 'Unknown Stage';
            return (
              <Card key={stageId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stageName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count as number}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active leads</p>
                </CardContent>
              </Card>
            );
          })}
          {Object.keys(metrics.leadsByStage || {}).length === 0 && (
            <div className="text-sm text-muted-foreground italic col-span-full">No active leads in pipeline stages yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
