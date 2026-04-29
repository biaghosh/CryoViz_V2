import { useState, useEffect, useCallback } from 'react';

export interface DashboardMetrics {
  totalUsers: number;
  totalDatasets: number;
  totalUploads: number;
  completionRate: number;
  activeUsers: number;
}

export interface ChartDataPoint {
  date: string;
  users: number;
  datasets: number;
  uploads: number;
  systemLoad: number;
}

export interface RecentUpload {
  _id: string;
  filename: string;
  status: string;
  createdAt: string;
  userId: string;
}

export interface DatasetStat {
  _id: string;
  count: number;
}

export interface UserActivity {
  _id: string;
  name: string;
  email: string;
  accessLevel: string;
  uploadCount: number;
  lastActivity?: string;
}

export interface SystemMetric {
  _id: string;
  timestamp: string;
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface SystemStatus {
  database: string;
  api: string;
  storage: string;
  lastCheck: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  chartData: ChartDataPoint[];
  recentUploads: RecentUpload[];
  datasetStats: DatasetStat[];
  userActivity: UserActivity[];
  systemMetrics: SystemMetric[];
  systemStatus: SystemStatus;
  lastUpdated: string;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      
      if (!response.ok) {
        let errMsg = 'Failed to fetch dashboard data';
        try {
          const result = await response.json();
          if (result.error) errMsg = result.error;
        } catch (_) {}
        throw new Error(errMsg);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSystemMetrics = useCallback(async (metrics: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  }) => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-system-metrics',
          data: metrics,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update system metrics');
      }

      // Refresh dashboard data after update
      await fetchDashboardData();
    } catch (err) {
      console.error('Error updating system metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchDashboardData]);

  const updateDatasetStatus = useCallback(async (datasetId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-dataset-status',
          data: { datasetId, status },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dataset status');
      }

      // Refresh dashboard data after update
      await fetchDashboardData();
    } catch (err) {
      console.error('Error updating dataset status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    fetchDashboardData,
    updateSystemMetrics,
    updateDatasetStatus,
  };
}
