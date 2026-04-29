"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  BookOpen, 
  Wrench, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  MessageSquare,
  FileText,
  Video,
  Download
} from "lucide-react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator as UISeparator } from "@/components/ui/separator";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
  category: 'viewer' | 'tools' | 'general' | 'technical';
}

interface GuideItem {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  link?: string;
}

interface TroubleshootingItem {
  problem: string;
  solution: string;
  category: 'viewer' | 'tools' | 'general';
}

const faqData: FAQItem[] = [
  {
    question: "How do I navigate the 3D viewer?",
    answer: "Use your mouse to navigate: Left click and drag to rotate the view, right click and drag to pan, scroll wheel to zoom in/out. Touch devices support pinch to zoom and swipe gestures.",
    category: "viewer"
  },
  {
    question: "How do I add annotations to my data?",
    answer: "In the orthographic viewer, click the 'Annotations' button in the toolbar. You can add text notes, measurements, and markers to specific points on your data. All annotations are saved automatically.",
    category: "tools"
  },
  {
    question: "How do I use the measurement tools?",
    answer: "Select the measurement tool from the toolbar, then click on two points to measure distance. For area measurements, click multiple points to create a polygon. Measurements are displayed in real-time.",
    category: "tools"
  },
  {
    question: "How do I save different views of my data?",
    answer: "Use the 'Save View' button in the view controls panel. You can save multiple views with custom names and restore them later. Views include camera position, zoom level, and clipping settings.",
    category: "viewer"
  },
  {
    question: "How do I adjust the rendering quality?",
    answer: "Use the quality slider in the viewer controls. Higher quality provides better visual detail but may be slower. Lower quality is faster and good for initial exploration.",
    category: "viewer"
  },
  {
    question: "How do I use clipping planes?",
    answer: "Enable clipping in the viewer controls, then adjust the clipping planes using the sliders. This allows you to 'cut through' your data to see internal structures.",
    category: "tools"
  }
];

const guideData: GuideItem[] = [
  {
    title: "Getting Started with the 3D Viewer",
    description: "Learn the basics of navigating the 3D viewer, understanding the interface, and viewing your data from different angles.",
    difficulty: "beginner",
    estimatedTime: "10 minutes",
    link: "#"
  },
  {
    title: "Using Annotations and Notes",
    description: "Master the annotation system to add notes, markers, and text to your data for better analysis and collaboration.",
    difficulty: "intermediate",
    estimatedTime: "15 minutes",
    link: "#"
  },
  {
    title: "Measurement and Analysis Tools",
    description: "Learn how to use distance measurements, area calculations, and other analysis tools to extract quantitative data.",
    difficulty: "intermediate",
    estimatedTime: "20 minutes",
    link: "#"
  },
  {
    title: "Advanced Viewer Features",
    description: "Explore clipping planes, custom views, rendering quality settings, and other advanced visualization features.",
    difficulty: "advanced",
    estimatedTime: "25 minutes",
    link: "#"
  }
];

const troubleshootingData: TroubleshootingItem[] = [
  {
    problem: "3D viewer is slow or unresponsive",
    solution: "Try reducing the rendering quality in the viewer settings. Close other browser tabs and ensure you have sufficient RAM available. For large datasets, start with lower quality and increase gradually.",
    category: "viewer"
  },
  {
    problem: "Annotations not saving properly",
    solution: "Make sure you're logged in and have proper permissions. Check that you're clicking the save button after adding annotations. Try refreshing the page if the issue persists.",
    category: "tools"
  },
  {
    problem: "Measurement tools not accurate",
    solution: "Ensure you're in the correct measurement mode and clicking precisely on the points you want to measure. Check that the scale is properly calibrated for your data.",
    category: "tools"
  },
  {
    problem: "Clipping planes not working",
    solution: "Make sure clipping is enabled in the viewer controls. Try adjusting the clipping values gradually. Some data formats may not support all clipping features.",
    category: "viewer"
  }
];

export default function SupportPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const filteredFAQ = activeCategory === 'all' 
    ? faqData 
    : faqData.filter(item => item.category === activeCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'viewer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tools': return 'bg-green-100 text-green-800 border-green-200';
      case 'general': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'technical': return 'bg-orange-100 text-orange-800 border-orange-200';
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
            <UISeparator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/support">Support</BreadcrumbLink>
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
            <HelpCircle className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Support Center</h1>
              <p className="text-muted-foreground">Find answers, guides, and solutions to help you use CryoViz effectively</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">Still Need Help?</h3>
                    <p className="text-sm text-muted-foreground">Submit feedback or request support</p>
                  </div>
                </div>
                <Button className="w-full mt-3" asChild>
                  <Link href="/feedback">Get Help</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">User Manual</h3>
                    <p className="text-sm text-muted-foreground">Complete guide to CryoViz features</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link href="#" target="_blank">Read Manual</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Video className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">Video Tutorials</h3>
                    <p className="text-sm text-muted-foreground">Step-by-step video guides</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link href="#" target="_blank">Watch Videos</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="faq" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="guides">User Guides</TabsTrigger>
              <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Find quick answers to common questions about CryoViz
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Button
                      variant={activeCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory('all')}
                    >
                      All Categories
                    </Button>
                    <Button
                      variant={activeCategory === 'viewer' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory('viewer')}
                    >
                      Viewer
                    </Button>
                    <Button
                      variant={activeCategory === 'tools' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory('tools')}
                    >
                      Tools
                    </Button>
                    <Button
                      variant={activeCategory === 'general' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory('general')}
                    >
                      General
                    </Button>
                    <Button
                      variant={activeCategory === 'technical' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory('technical')}
                    >
                      Technical
                    </Button>
                  </div>

                  {/* FAQ Items */}
                  <div className="space-y-4">
                    {filteredFAQ.map((item, index) => (
                      <div key={index} className="border rounded-lg">
                        <button
                          className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => toggleFAQ(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={getCategoryColor(item.category)}>
                                {item.category}
                              </Badge>
                              <h3 className="font-medium">{item.question}</h3>
                            </div>
                            {expandedFAQ.includes(index) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </button>
                        {expandedFAQ.includes(index) && (
                          <div className="px-4 pb-4">
                            <Separator className="mb-4" />
                            <p className="text-muted-foreground">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Guides Tab */}
            <TabsContent value="guides" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Guides</CardTitle>
                  <CardDescription>
                    Step-by-step tutorials to help you master CryoViz features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guideData.map((guide, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{guide.title}</h3>
                            <Badge variant="outline" className={getDifficultyColor(guide.difficulty)}>
                              {guide.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {guide.description}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                            <span>⏱️ {guide.estimatedTime}</span>
                          </div>
                          <Button className="w-full" variant="outline" asChild>
                            <Link href={guide.link || "#"}>
                              Start Guide
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Troubleshooting Tab */}
            <TabsContent value="troubleshooting" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Troubleshooting</CardTitle>
                  <CardDescription>
                    Common problems and their solutions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {troubleshootingData.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Wrench className="h-5 w-5 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-medium mb-2">{item.problem}</h3>
                            <p className="text-muted-foreground">{item.solution}</p>
                            <Badge variant="outline" className="mt-2">
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Resources</CardTitle>
                  <CardDescription>
                    Links to documentation, downloads, and external resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <Card>
                       <CardContent className="p-4">
                         <div className="flex items-center gap-3 mb-3">
                           <FileText className="h-6 w-6" />
                           <h3 className="font-semibold">User Manual</h3>
                         </div>
                         <p className="text-sm text-muted-foreground mb-3">
                           Complete user manual covering all CryoViz features, tools, and best practices.
                         </p>
                         <Button className="w-full" variant="outline" asChild>
                           <Link href="#" target="_blank">
                             Read User Manual
                             <ExternalLink className="h-4 w-4 ml-2" />
                           </Link>
                         </Button>
                       </CardContent>
                     </Card>

                                         <Card>
                       <CardContent className="p-4">
                         <div className="flex items-center gap-3 mb-3">
                           <Download className="h-6 w-6" />
                           <h3 className="font-semibold">Sample Data</h3>
                         </div>
                         <p className="text-sm text-muted-foreground mb-3">
                           Download sample datasets to practice with CryoViz tools and features.
                         </p>
                         <Button className="w-full" variant="outline" asChild>
                           <Link href="#" target="_blank">
                             Download Samples
                             <ExternalLink className="h-4 w-4 ml-2" />
                           </Link>
                         </Button>
                       </CardContent>
                     </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Video className="h-6 w-6" />
                          <h3 className="font-semibold">Video Library</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Comprehensive video tutorials covering all aspects of CryoViz.
                        </p>
                        <Button className="w-full" variant="outline" asChild>
                          <Link href="#" target="_blank">
                            Watch Videos
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <BookOpen className="h-6 w-6" />
                          <h3 className="font-semibold">Knowledge Base</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Searchable knowledge base with articles, tips, and best practices.
                        </p>
                        <Button className="w-full" variant="outline" asChild>
                          <Link href="#" target="_blank">
                            Search Knowledge Base
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bottom CTA */}
          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Still Can&apos;t Find What You&apos;re Looking For?</h3>
              <p className="text-muted-foreground mb-4">
                Our support team is here to help. Submit feedback or contact us directly.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <Link href="/feedback">Submit Feedback</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="mailto:support@cryoviz.com">Email Support</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
