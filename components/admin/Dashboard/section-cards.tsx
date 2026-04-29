"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { 
  Users, 
  Database, 
  Upload, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"

export function SectionCards() {
  const { data, loading, error, lastUpdate, fetchDashboardData } = useDashboardData()

  const cards = React.useMemo(() => {
    if (!data) return []
    
    return [
      {
        title: "Total Users",
        value: data.metrics.totalUsers.toLocaleString(),
        description: "Registered users on the platform",
        icon: Users,
        trend: "+12%",
        trendDirection: "up" as const,
        color: "text-muted-foreground"
      },
      {
        title: "Total Datasets",
        value: data.metrics.totalDatasets.toLocaleString(),
        description: "Datasets in the system",
        icon: Database,
        trend: "+8%",
        trendDirection: "up" as const,
        color: "text-muted-foreground"
      },
      {
        title: "Total Uploads",
        value: data.metrics.totalUploads.toLocaleString(),
        description: "Files uploaded to the system",
        icon: Upload,
        trend: "+15%",
        trendDirection: "up" as const,
        color: "text-muted-foreground"
      },
      {
        title: "Completion Rate",
        value: `${data.metrics.completionRate}%`,
        description: "Overall project completion",
        icon: Activity,
        trend: "+5%",
        trendDirection: "up" as const,
        color: "text-muted-foreground"
      }
    ]
  }, [data])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-muted-foreground bg-muted border-border'
      case 'warning':
        return 'text-muted-foreground bg-muted border-border'
      case 'error':
        return 'text-muted-foreground bg-muted border-border'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Dashboard Error
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      {/* Header with refresh controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Real-time metrics and system status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Live'}
          </Badge>
          <button
            onClick={fetchDashboardData}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title="Refresh dashboard data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
              <div className="flex items-center gap-1 mt-2">
                {card.trendDirection === "up" ? (
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {card.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Status */}
      {data?.systemStatus && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
              <CardDescription>
                Current system health and performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(data.systemStatus).map(([key, status]) => (
                  <div key={key} className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <p className="font-medium capitalize">{key}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(status)}`}
                      >
                        {status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      {data?.recentUploads && data.recentUploads.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>
                Latest uploads and system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentUploads.slice(0, 5).map((upload) => (
                  <div key={upload._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-muted-foreground bg-muted border-border"
                    >
                      {upload.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
