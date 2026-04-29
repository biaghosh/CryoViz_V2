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
import { Send, Clock, MessageSquare } from "lucide-react";
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

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'general' as Feedback['type'],
    category: 'other' as Feedback['category'],
    priority: 'medium' as Feedback['priority'],
    title: '',
    description: '',
    rating: 5
  });

  // Fetch user's feedback
  const fetchFeedback = useCallback(async () => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Submit new feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) {
      toast.error('Please log in to submit feedback');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Feedback submitted successfully!');
        setFormData({
          type: 'general',
          category: 'other',
          priority: 'medium',
          title: '',
          description: '',
          rating: 5
        });
        fetchFeedback(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  // Load feedback on component mount
  useEffect(() => {
    fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
                  <BreadcrumbLink href="/feedback ">feedback</BreadcrumbLink>
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
            <Send className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Feedback</h1>
              <p className="text-muted-foreground">Help us improve CryoViz by sharing your thoughts and reporting issues</p>
            </div>
          </div>

          <Tabs defaultValue="submit" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="submit">Submit Feedback</TabsTrigger>
              <TabsTrigger value="history">My Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="submit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Submit New Feedback</CardTitle>
                  <CardDescription>
                    Tell us about bugs, suggest features, or share your experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select 
                          value={formData.type} 
                          onValueChange={(value: Feedback['type']) => setFormData(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                                                  <SelectContent>
                          <SelectItem value="bug">Bug Report</SelectItem>
                          <SelectItem value="feature">Feature Request</SelectItem>
                          <SelectItem value="improvement">Improvement</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value: Feedback['category']) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                                                  <SelectContent>
                          <SelectItem value="ui">User Interface</SelectItem>
                          <SelectItem value="functionality">Functionality</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="data">Data & Analysis</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={formData.priority} 
                          onValueChange={(value: Feedback['priority']) => setFormData(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                                                  <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Brief description of your feedback"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Provide detailed information about your feedback, bug report, or feature request..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={5}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rating">How would you rate your overall experience? (Optional)</Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                            className={`text-2xl ${star <= formData.rating ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          {formData.rating === 1 && 'Poor'}
                          {formData.rating === 2 && 'Fair'}
                          {formData.rating === 3 && 'Good'}
                          {formData.rating === 4 && 'Very Good'}
                          {formData.rating === 5 && 'Excellent'}
                        </span>
                      </div>
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Feedback History</CardTitle>
                  <CardDescription>
                    Track the status of your submitted feedback and responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">Loading your feedback...</p>
                    </div>
                  ) : feedback.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No feedback submitted yet</p>
                      <p className="text-sm text-gray-400">Submit your first feedback to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedback.map((item) => (
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
                          </div>
                          
                          <p className="text-gray-700">{item.description}</p>
                          
                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">Rating:</span>
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
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
