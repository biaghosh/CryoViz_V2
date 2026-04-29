"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Send, MessageSquare, Clock, CheckCircle, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface Feedback {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'bug' | 'feature' | 'improvement' | 'general';
  category: 'ui' | 'functionality' | 'performance' | 'data' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
  adminResponse?: string;
  adminResponseAt?: Date;
}

export default function AdminFeedbackPage() {
  const { data: session } = useSession();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | Feedback['status'],
    type: 'all' as 'all' | Feedback['type'],
    priority: 'all' as 'all' | Feedback['priority'],
    search: ''
  });

  // Response form state
  const [responseForm, setResponseForm] = useState({
    feedbackId: '',
    status: 'pending' as Feedback['status'],
    adminResponse: ''
  });

  // Fetch all feedback (admin only)
  const fetchFeedback = useCallback(async () => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/feedback/admin');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      } else if (response.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to load feedback');
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Update feedback status and response
  const handleUpdateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseForm.feedbackId || !responseForm.status) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: responseForm.feedbackId,
          status: responseForm.status,
          adminResponse: responseForm.adminResponse || undefined
        })
      });

      if (response.ok) {
        toast.success('Feedback updated successfully!');
        setResponseForm({
          feedbackId: '',
          status: 'pending',
          adminResponse: ''
        });
        fetchFeedback(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update feedback');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to update feedback');
    } finally {
      setUpdating(false);
    }
  };

  // Load feedback on component mount
  useEffect(() => {
    fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Filter feedback based on current filters
  const filteredFeedback = feedback.filter(item => {
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !item.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: Feedback['status']) => {
    switch (status) {
      case 'pending': return 'bg-muted text-muted-foreground border-border';
      case 'in-progress': return 'bg-muted text-muted-foreground border-border';
      case 'resolved': return 'bg-muted text-muted-foreground border-border';
      case 'closed': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority: Feedback['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-muted text-muted-foreground border-border';
      case 'high': return 'bg-muted text-muted-foreground border-border';
      case 'medium': return 'bg-muted text-muted-foreground border-border';
      case 'low': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };



  const getStatusCount = (status: Feedback['status']) => {
    return feedback.filter(item => item.status === status).length;
  };

  const getPriorityCount = (priority: Feedback['priority']) => {
    return feedback.filter(item => item.priority === priority).length;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"    
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin/feedback ">admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
               
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Feedback Management</h1>
              <p className="text-muted-foreground">Manage and respond to user feedback and feature requests</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold">{getStatusCount('pending')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium text-muted-foreground">In Progress</span>
                </div>
                <p className="text-2xl font-bold">{getStatusCount('in-progress')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium text-muted-foreground">Resolved</span>
                </div>
                <p className="text-2xl font-bold">{getStatusCount('resolved')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium text-muted-foreground">Critical</span>
                </div>
                <p className="text-2xl font-bold">{getPriorityCount('critical')}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="feedback" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feedback">All Feedback</TabsTrigger>
              <TabsTrigger value="respond">Respond to Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Overview</CardTitle>
                  <CardDescription>
                    View and filter all user feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={filters.status} 
                        onValueChange={(value: 'all' | Feedback['status']) => setFilters(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select 
                        value={filters.type} 
                        onValueChange={(value: 'all' | Feedback['type']) => setFilters(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="bug">Bug Report</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="improvement">Improvement</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select 
                        value={filters.priority} 
                        onValueChange={(value: 'all' | Feedback['priority']) => setFilters(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search feedback..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feedback List */}
                  {loading ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Loading feedback...</p>
                    </div>
                  ) : filteredFeedback.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No feedback found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredFeedback.map((item) => (
                        <div key={item._id} className="border rounded-lg p-4 space-y-3">
                                                   <div className="flex items-start justify-between">
                           <div className="flex items-center gap-3">
                             <div>
                               <h3 className="font-medium">{item.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={getPriorityColor(item.priority)}>
                                    {item.priority}
                                  </Badge>
                                  <Badge variant="outline" className={getStatusColor(item.status)}>
                                    {item.status}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setResponseForm({
                                feedbackId: item._id,
                                status: item.status,
                                adminResponse: item.adminResponse || ''
                              })}
                            >
                              Respond
                            </Button>
                          </div>
                          
                          <p className="text-gray-700">{item.description}</p>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>From: {item.userName} ({item.userEmail})</span>
                            <span>Category: {item.category}</span>
                          </div>

                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">User Rating:</span>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-sm ${star <= item.rating! ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          )}

                          {item.adminResponse && (
                            <div className="border-l-4 border-border p-3 rounded-r-lg bg-muted/50">
                              <p className="text-sm font-medium mb-1">Admin Response:</p>
                              <p className="text-sm">{item.adminResponse}</p>
                              {item.adminResponseAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(item.adminResponseAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="respond" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Respond to Feedback</CardTitle>
                  <CardDescription>
                    Update feedback status and provide responses to users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateFeedback} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="feedbackId">Feedback ID</Label>
                        <Input
                          id="feedbackId"
                          placeholder="Select feedback to respond to"
                          value={responseForm.feedbackId}
                          onChange={(e) => setResponseForm(prev => ({ ...prev, feedbackId: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={responseForm.status} 
                          onValueChange={(value: Feedback['status']) => setResponseForm(prev => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminResponse">Admin Response (Optional)</Label>
                      <Textarea
                        id="adminResponse"
                        placeholder="Provide a response to the user..."
                        value={responseForm.adminResponse}
                        onChange={(e) => setResponseForm(prev => ({ ...prev, adminResponse: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <Button type="submit" disabled={updating} className="w-full">
                      {updating ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Update Feedback
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
