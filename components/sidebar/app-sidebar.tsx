"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Bot,
  LifeBuoy,
  Send,
  Frame,
  CornerDownRight,
  Lock,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

import { User, Dataset, Institution, DatasetMapping } from "@/lib/models";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavProjects } from "@/components/sidebar/nav-projects";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";

const ORGAN_METADATA: Record<string, { color: string; label: string }> = {
  background: { color: '#000000', label: 'Background' },
  alpha: { color: '#ffffff', label: 'Alpha' },
  liver: { color: '#FF4136', label: 'Liver' },
  lung: { color: '#2ECC40', label: 'Lung' },
  spleen: { color: '#FFDC00', label: 'Spleen' },
  brain: { color: '#B10DC9', label: 'Brain' },
  thymus: { color: '#F012BE', label: 'Thymus' },
  heart: { color: '#FF851B', label: 'Heart' },
  stomach: { color: '#7FDBFF', label: 'Stomach' },
  left_kidney: { color: '#39CCCC', label: 'Left Kidney' },
  right_kidney: { color: '#3D9970', label: 'Right Kidney' },
  bladder: { color: '#0074D9', label: 'Bladder' },
  femur: { color: '#DDDDDD', label: 'Femur' },
  hip: { color: '#AAAAAA', label: 'Hip' },
  sternum: { color: '#FFEEAD', label: 'Sternum' },
  tibia: { color: '#D1D1D1', label: 'Tibia' },
  tail: { color: '#666666', label: 'Tail' }
};


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [userAccessLevel, setUserAccessLevel] = React.useState<string | null>("user");
  const [loadingGate, setLoadingGate] = React.useState(true);

  const activeDatasetId = searchParams.get("datasetId") || "";

  // 1. Fetch base admin data (Users, Base Dataset List)
const { data: adminData, isLoading: isLoadingAdmin } = useQuery({
  queryKey: ["adminData-sidebar", session?.user?.email],
  enabled: status === "authenticated",
  staleTime: 5 * 60 * 1000,
  queryFn: async () => {
    const response = await fetch("/api/admin");
    if (!response.ok) throw new Error("Failed to fetch admin data");
    const result = await response.json();

    // --- ADD TRUTH LOG HERE ---
      console.log("---------- DEBUG: USER DATA ----------");
      console.log("Logged-in Session Email:", session?.user?.email);
      console.log("Users found in Database:", result?.users);
      console.log("--------------------------------------");

    // FIXED: Define these as arrays immediately to prevent .find crashes
    const users = Array.isArray(result?.users) ? result.users : [];
    const datasets = Array.isArray(result?.datasets) ? result.datasets : [];
    
    // Now this is safe because users is guaranteed to be an array
const currentUser = users.find(
  (u: any) => u.email?.toLowerCase() === session?.user?.email?.toLowerCase()
);
    return {
      users,
      datasets,
      currentUser: currentUser || null,
    };
  },
});
  const { data: activeDatasetDetails } = useQuery({
  queryKey: ["activeDataset", activeDatasetId],
  enabled: !!activeDatasetId,
  queryFn: async () => {
    const res = await fetch(`/api/admin?datasetId=${activeDatasetId}`);
    if (!res.ok) throw new Error("Failed to fetch dataset details");
    const result = await res.json();
    return result.dataset; // <--- Add .dataset here too!
  },
});

  // 3. Load all mappings
const { data: mappingData, isLoading: isLoadingMappings } = useQuery<{ mappings: DatasetMapping[] }>({
  queryKey: ["datasetMappings-sidebar"],
  enabled: status === "authenticated",
  staleTime: 5 * 60 * 1000,
  queryFn: async () => {
    const res = await fetch("/api/dataset-mappings");
    if (!res.ok) throw new Error("Failed to fetch dataset mappings");
    const result = await res.json();
    
    // FIXED: Ensure mappings is always an array
    return {
      mappings: Array.isArray(result?.mappings) ? result.mappings : []
    };
  },
});

  // Auth Gate
  React.useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setLoadingGate(false);
      return;
    }
    if (adminData?.currentUser) {
      setUserAccessLevel(adminData.currentUser.accessLevel);
      setLoadingGate(false);
    }
  }, [status, adminData]);

  const loading = loadingGate || isLoadingAdmin || isLoadingMappings;

  console.log({ adminData, activeDatasetDetails, mappingData });

 const datasetById = React.useMemo(() => {
  const ds = adminData?.datasets ?? [];
  const m = new Map<string, Dataset>();
  ds.forEach((d: any) => { // <-- Fixed: Added ': any'
    const id = d._id || d.id;
    if (id) m.set(id.toString(), d);
  });
  return m;
}, [adminData?.datasets]);
  // Merge the basic dataset info with the detailed (organ-loaded) info
  const currentDataset = React.useMemo(() => {
    const basic = activeDatasetId ? datasetById.get(activeDatasetId) : null;
    if (!activeDatasetDetails) return basic;
    return { ...basic, ...activeDatasetDetails };
  }, [activeDatasetId, datasetById, activeDatasetDetails]);

  const currentUser = adminData?.currentUser;
  const assignedSet = React.useMemo(() => new Set(currentUser?.assignedDatasets || []), [currentUser?.assignedDatasets]);

  const activeMapping = React.useMemo(() => {
  // SAFETY CHECK: Default to empty array
  const maps = mappingData?.mappings || []; 
  if (!activeDatasetId || maps.length === 0) return null;
  
  return maps.find((m: any) => 
    m?.parentId === activeDatasetId || 
    (Array.isArray(m?.children) && m.children.some((c: any) => c?.datasetId === activeDatasetId))
  ) || null;
}, [mappingData?.mappings, activeDatasetId]);

  const parentIdToShow = activeMapping?.parentId;

  const mappingChildren = React.useMemo(() => {
    if (!activeMapping) return [];
    return (activeMapping.children || []).map((c) => {
      const d = datasetById.get(c.datasetId) || null;
      const isActive = c.datasetId === activeDatasetId;
      return {
        id: c.datasetId,
        title: isActive ? `→ ${c.alias || d?.name || c.datasetId}` : (c.alias || d?.name || c.datasetId),
        hasAccess: userAccessLevel === "admin" || assignedSet.has(c.datasetId),
        isActive,
      };
    });
  }, [activeMapping, datasetById, userAccessLevel, assignedSet, activeDatasetId]);

  const parentItem = React.useMemo(() => {
    if (!parentIdToShow) return null;
    const d = datasetById.get(parentIdToShow);
    const isActive = parentIdToShow === activeDatasetId;
    return {
      id: parentIdToShow,
      title: isActive ? `→ ${d?.name || "Parent"}` : (d?.name || "Parent"),
      hasAccess: userAccessLevel === "admin" || assignedSet.has(parentIdToShow),
      isActive,
    };
  }, [parentIdToShow, datasetById, userAccessLevel, assignedSet, activeDatasetId]);

  // --- Nav Model Construction ---
const mappingNavItems = React.useMemo(() => {
  // SAFETY CHECK: If we don't have a dataset yet, return empty list
  if (!currentDataset) return [];

  // 1. UPDATED TYPE: organList is now an array of objects from your API
  const organList: any[] = currentDataset?.organs || [];
    
  const maskCategory = organList.length > 0 ? {
  title: "Masks", // Simply "Masks" - no dynamic numbering or symbols
  url: "#",
  icon: Frame,
  items: organList.map((organ: any) => {
    // Determine the name (handles if organ is a string or an object)
    const name = typeof organ === 'string' ? organ : (organ.name || "Unknown");
    const lowerName = name.toLowerCase();

    return {
      title: name,
      isMask: true,
      maskId: lowerName,
      blobUrl: typeof organ === 'object' ? organ.blobUrl : null,
      // Color logic remains the same
    };
  })
} : null;
  if (parentItem) {
    return [
      {
        title: parentItem.title,
        url: parentItem.hasAccess ? `/home?datasetId=${parentItem.id}` : "#",
        items: [
          ...(maskCategory ? [maskCategory] : []), 
          ...mappingChildren.map((c) => ({
            title: c.title,
            url: c.hasAccess ? `/home?datasetId=${c.id}` : "#",
            icon: c.hasAccess ? CornerDownRight : Lock,
          })),
        ],
      },
    ];
  } else if (currentDataset && !activeMapping) {
    const id = (currentDataset as any)._id || currentDataset.id || activeDatasetId;
    return [
      {
        title: `→ ${currentDataset.name}`,
        url: `/home?datasetId=${id}`,
        items: maskCategory ? [maskCategory] : [],
      },
    ];
  }
  return [];
}, [parentItem, mappingChildren, currentDataset, activeMapping, activeDatasetId]);
  const navMain = [
    ...(userAccessLevel === "admin"
      ? [{
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard,
          isActive: true,
          items: [
            { title: "Institutions", url: "/admin/institutions" },
            { title: "Studies", url: "/admin/studies" },
            { title: "Users", url: "/admin/users" },
            { title: "Datasets", url: "/admin/dataset" },
            { title: "Mappings", url: "/admin/mappings" },
            { title: "Feedback", url: "/admin/feedback" },
          ],
        }]
      : []),
    {
      title: currentDataset ? `Datasets - ${currentDataset.name}` : "Datasets",
      url: "/users_datasets",
      icon: Bot,
      items: mappingNavItems,
    },
  ];

  const sidebarData = {
    navSecondary: [
      { title: "Support", url: "/support", icon: LifeBuoy },
      { title: "Feedback", url: "/feedback", icon: Send },
    ],
    projects: [{ name: "CryoViz 1", url: "#", icon: Frame }],
  };

  const userData = {
    name: session?.user?.name || session?.user?.email || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
    accessLevel: userAccessLevel || "user",
  };

  if (loading) {
    return (
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <div className="flex p-4 items-center gap-2">
            <Image src="/images/biv-logo.png" alt="Logo" width={32} height={32} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">BioInvision Inc</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <Image src="/images/biv-logo.png" alt="CryoViz Logo" width={32} height={32} className="object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">BioInvision Inc</span>
                  <span className="truncate text-xs">CryoViz™ Web</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
       <NavMain 
  items={navMain} 
  onMaskToggle={(organName: string, isVisible: boolean) => {
    // 1. Find the specific organ object from our dataset
    const organData = currentDataset?.organs?.find(
      (o: any) => (typeof o === 'string' ? o : o.name) === organName
    );

    // 2. Get the URL
    const url = typeof organData === 'object' ? organData.blobUrl : "No URL found in DB";

// --- ADD THIS LINE: Get color from your constant ---
  const organColor = ORGAN_METADATA[organName.toLowerCase()]?.color || "#FF0000";

    // 3. Dispatch the event so the viewer knows which URL to load
    window.dispatchEvent(new CustomEvent('mask-toggle', { 
      detail: { 
        maskId: organName, 
        isVisible, 
        blobUrl: url // Sending the actual DB URL to the viewer
      } 
    }));
  }} 
/>
        <NavProjects projects={sidebarData.projects} />
        <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <NavUser user={userData} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}