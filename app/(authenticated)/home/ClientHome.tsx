"use client";

import { Suspense, useState, useEffect } from "react";
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

type MediaType = "still" | "movie";

export default function ClientHome() {



  const [activeTab, setActiveTab] = useState<"orthographic" | "volume" | "media" | "analysis">("orthographic");
  const [activeMasks, setActiveMasks] = useState<Record<string, boolean>>({});
  const [mediaType, setMediaType] = useState<MediaType>("still");
  
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("datasetId");

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
                                onClick={() => setMediaType(type as MediaType)}
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
                        <div className="flex items-center justify-center h-full">
                          <Image
                            src="https://bivlargefiles.blob.core.windows.net/images/cryovizweb_still.png"
                            alt="Still media"
                            fill
                            className="object-contain"
                            priority
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500 dark:text-gray-400">Movie media content coming soon...</p>
                        </div>
                      )}
                    </div>
                  ) : activeTab === "analysis" ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 dark:text-gray-400">Analysis content coming soon...</p>
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
