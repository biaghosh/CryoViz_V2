"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import VolumeViewer from "@/components/VolumeViewerPng";
import OrthographicViewer from "@/components/OrthographicViewer/OrthographicViewer";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";

type MediaType = "still" | "movie";

export default function ClientHome() {



  const [activeTab, setActiveTab] = useState<"orthographic" | "volume" | "media" | "analysis">("orthographic");
  const [activeMasks, setActiveMasks] = useState<Record<string, boolean>>({});
  const [mediaType, setMediaType] = useState<MediaType>("still");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [analysisZoom, setAnalysisZoom] = useState(1);
  const [analysisPan, setAnalysisPan] = useState({ x: 0, y: 0 });
  const [analysisIsDragging, setAnalysisIsDragging] = useState(false);
  const [analysisDragStart, setAnalysisDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const analysisContainerRef = useRef<HTMLDivElement>(null);
  const analysisChartRef = useRef<HTMLDivElement>(null);
  
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("datasetId");

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.2;

 // Inside ClientHome.tsx useEffect
useEffect(() => {
  const handleToggle = (event: any) => {
    const { maskId, isVisible, blobUrl, color } = event.detail;
    
    setActiveMasks((prev) => ({ 
      ...prev, 
      // We must store the color here, otherwise data.color is undefined in the viewer
      [maskId]: isVisible ? { blobUrl, color } : false 
    }));
  };
  window.addEventListener("mask-toggle", handleToggle);
  return () => window.removeEventListener("mask-toggle", handleToggle);
}, []);

  const { data: dataset, isLoading, error } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: async () => {
      if (!datasetId) return null;
      const response = await fetch(`/api/admin?datasetId=${datasetId}`);
      if (!response.ok) throw new Error("Failed to fetch dataset");
      
      const result = await response.json();
      
     
      return result.dataset || null;
    },
    enabled: !!datasetId,
    staleTime: 5 * 60 * 1000, 
  });

  // Handle mouse wheel zoom for image
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (mediaType !== "still" || !imageContainerRef.current) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    
    setZoom(newZoom);
  };

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mediaType !== "still" || zoom === MIN_ZOOM) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageContainerRef.current) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Calculate boundary constraints
    const container = imageContainerRef.current;
    const maxPanX = (container.offsetWidth * (zoom - 1)) / 2;
    const maxPanY = (container.offsetHeight * (zoom - 1)) / 2;
    
    setPan({
      x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
    });
  };

  // Handle mouse up for panning
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom and pan
  const handleResetZoom = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  // Handle zoom in button
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  };

  // Handle zoom out button
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  };

  // Reset pan when zoom changes to MIN_ZOOM
  useEffect(() => {
    if (zoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Analysis Chart Zoom & Pan Handlers
  const handleAnalysisWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!analysisContainerRef.current) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, analysisZoom + delta));
    
    setAnalysisZoom(newZoom);
  };

  const handleAnalysisMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (analysisZoom === MIN_ZOOM) return;
    
    setAnalysisIsDragging(true);
    setAnalysisDragStart({ x: e.clientX - analysisPan.x, y: e.clientY - analysisPan.y });
  };

  const handleAnalysisMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!analysisIsDragging || !analysisContainerRef.current) return;
    
    const newX = e.clientX - analysisDragStart.x;
    const newY = e.clientY - analysisDragStart.y;
    
    const container = analysisContainerRef.current;
    const maxPanX = (container.offsetWidth * (analysisZoom - 1)) / 2;
    const maxPanY = (container.offsetHeight * (analysisZoom - 1)) / 2;
    
    setAnalysisPan({
      x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
    });
  };

  const handleAnalysisMouseUp = () => {
    setAnalysisIsDragging(false);
  };

  const handleAnalysisResetZoom = () => {
    setAnalysisZoom(MIN_ZOOM);
    setAnalysisPan({ x: 0, y: 0 });
  };

  const handleAnalysisZoomIn = () => {
    setAnalysisZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  };

  const handleAnalysisZoomOut = () => {
    setAnalysisZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  };

  const handleDownloadChart = async () => {
    try {
      const response = await fetch("https://bivlargefiles.blob.core.windows.net/images/cryovizweb_analysis.svg");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cryoviz_analysis.svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading chart:", error);
    }
  };

  useEffect(() => {
    if (analysisZoom === MIN_ZOOM) {
      setAnalysisPan({ x: 0, y: 0 });
    }
  }, [analysisZoom]);

 if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p>Loading dataset...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p>Error loading dataset: {error.message}</p>
      </div>
    );
  }
  if (!dataset || !dataset._id || !dataset.brightfieldBlobUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p>Dataset not found or invalid dataset ID provided</p>
      </div>
    );
  }

  const getPageTitle = () => {
    const titleMap: Record<string, string> = {
      orthographic: "Orthographic Viewer",
      volume: "Volume Viewer",
      media: "Media",
      analysis: "Analysis",
    };
    return titleMap[activeTab] || "Viewer";
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full w-full overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">CryoViz</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {getPageTitle()}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            <motion.div 
              className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="flex p-0.5 rounded-full border backdrop-blur-md bg-white/80 dark:bg-black/80 border-gray-300 dark:border-gray-800">
                {["orthographic", "volume", "media", "analysis"].map((tab) => (
                  <Button
                    key={tab}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-4 py-1 text-xs tracking-wider transition-colors",
                      activeTab === tab
                        ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                    )}
                    onClick={() => setActiveTab(tab as "orthographic" | "volume" | "media" | "analysis")}
                  >
                    {tab.toUpperCase()}
                  </Button>
                ))}
              </div>
            </motion.div>

           

            <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-hidden">
              <div className="bg-muted/50 min-h-0 flex-1 rounded-xl overflow-hidden relative">
                <div className="p-4 h-full overflow-hidden">
                  {activeTab === "orthographic" ? (
                    <Suspense fallback={<div>Loading Orthographic Viewer...</div>}>
                      <OrthographicViewer
                        brightfieldBlobUrl={dataset.brightfieldBlobUrl}
                        fluorescentBlobUrl={dataset.fluorescentBlobUrl}
                        datasetId={dataset._id?.toString() || ""}
                        brightfieldNumZ={dataset.brightfieldNumZ}
                        brightfieldNumY={dataset.brightfieldNumY}
                        brightfieldNumX={dataset.brightfieldNumX}
                        fluorescentNumZ={dataset.fluorescentNumZ}
                        fluorescentNumY={dataset.fluorescentNumY}
                        fluorescentNumX={dataset.fluorescentNumX}
                        maskId={dataset.maskId}
                        activeMasks={activeMasks} // Pass checkbox state
                      />
                    </Suspense>
                  ) : activeTab === "volume" ? (
                    <Suspense fallback={<div>Loading Volume Viewer...</div>}>
                      <VolumeViewer
                        brightfieldBlobUrl={dataset.brightfieldBlobUrl}
                        fluorescentBlobUrl={dataset.fluorescentBlobUrl}
                        datasetId={dataset._id?.toString() || ""}
                        brightfieldNumZ={dataset.brightfieldNumZ}
                        fluorescentNumZ={dataset.fluorescentNumZ}
                        spacing={dataset.spacing}
                        activeMasks={activeMasks} // Pass checkbox state
                      />
                    </Suspense>
                  ) : activeTab === "media" ? (
                    <div className="relative w-full h-full">
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg absolute top-4 left-4 z-10">
                        <div className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Media Type</div>
                        <div role="radiogroup" className="flex gap-4">
                          {["still", "movie"].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <button
                                type="button"
                                role="radio"
                                aria-checked={mediaType === type}
                                value={type}
                                className={cn(
                                  "border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]",
                                  mediaType === type ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-gray-700"
                                )}
                                onClick={() => {
                                  setMediaType(type as MediaType);
                                  setZoom(MIN_ZOOM);
                                  setPan({ x: 0, y: 0 });
                                }}
                              >
                                {mediaType === type && (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle absolute size-2">
                                    <circle cx="12" cy="12" r="1"></circle>
                                  </svg>
                                )}
                              </button>
                              <label className="flex items-center gap-2 font-medium select-none text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      {mediaType === "still" ? (
                        <>
                          <div
                            ref={imageContainerRef}
                            className="flex items-center justify-center h-full overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-grab active:cursor-grabbing"
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                          >
                            <div
                              className="relative w-full h-full"
                              style={{
                                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                transformOrigin: "center",
                                transition: isDragging ? "none" : "transform 0.1s ease-out",
                              }}
                            >
                              <Image
                                src="https://bivlargefiles.blob.core.windows.net/images/cryovizweb_still.png"
                                alt="Still media"
                                fill
                                className="object-contain pointer-events-none"
                                priority
                              />
                            </div>
                          </div>

                          {/* Zoom Controls */}
                          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg absolute bottom-4 left-4 z-10 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleZoomOut}
                              disabled={zoom <= MIN_ZOOM}
                              className="flex items-center gap-1"
                            >
                              <ZoomOut size={16} />
                              Zoom Out
                            </Button>
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300">
                              {Math.round(zoom * 100)}%
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleZoomIn}
                              disabled={zoom >= MAX_ZOOM}
                              className="flex items-center gap-1"
                            >
                              <ZoomIn size={16} />
                              Zoom In
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleResetZoom}
                              disabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0}
                              className="flex items-center gap-1"
                            >
                              <RotateCcw size={16} />
                              Reset
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
                          <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/7cCXCLuLRP8?si=be1ZrOe1T0g7LKtO"
                            title="CryoViz Movie"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="rounded-lg"
                          ></iframe>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "analysis" ? (
                    <div className="relative w-full h-full">
                      <div
                        ref={analysisContainerRef}
                        className="flex items-center justify-center h-full overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-grab active:cursor-grabbing"
                        onWheel={handleAnalysisWheel}
                        onMouseDown={handleAnalysisMouseDown}
                        onMouseMove={handleAnalysisMouseMove}
                        onMouseUp={handleAnalysisMouseUp}
                        onMouseLeave={handleAnalysisMouseUp}
                      >
                        <div
                          ref={analysisChartRef}
                          className="relative w-full h-full"
                          style={{
                            transform: `scale(${analysisZoom}) translate(${analysisPan.x / analysisZoom}px, ${analysisPan.y / analysisZoom}px)`,
                            transformOrigin: "center",
                            transition: analysisIsDragging ? "none" : "transform 0.1s ease-out",
                          }}
                        >
                          <img
                            src="https://bivlargefiles.blob.core.windows.net/images/cryovizweb_analysis.svg"
                            alt="Analysis Chart"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        </div>
                      </div>

                      {/* Analysis Chart Controls */}
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg absolute bottom-4 left-4 z-10 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAnalysisZoomOut}
                          disabled={analysisZoom <= MIN_ZOOM}
                          className="flex items-center gap-1"
                        >
                          <ZoomOut size={16} />
                          Zoom Out
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300">
                          {Math.round(analysisZoom * 100)}%
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAnalysisZoomIn}
                          disabled={analysisZoom >= MAX_ZOOM}
                          className="flex items-center gap-1"
                        >
                          <ZoomIn size={16} />
                          Zoom In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAnalysisResetZoom}
                          disabled={analysisZoom === MIN_ZOOM && analysisPan.x === 0 && analysisPan.y === 0}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw size={16} />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadChart}
                          className="flex items-center gap-1"
                        >
                          <Download size={16} />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
