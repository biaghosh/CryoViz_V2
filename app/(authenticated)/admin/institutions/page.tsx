"use client";


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
import Institutions from "@/components/admin/Institutions/Institutions";
import { User } from "@/lib/models";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstitutionsPage() {
    const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUserAccess = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated" || !session?.user?.email) {
        setError("Please log in to access this page.");
        router.push("/auth/login");
        return;
      }

      try {
        // Fetch user details from /api/admin to get accessLevel
        const response = await fetch("/api/admin");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        const currentUser = data.users.find((u: User) => u.email === session?.user?.email);

        if (!currentUser) {
          throw new Error("User not found");
        }

        setUser(currentUser);

        if (currentUser.accessLevel !== "admin") {
          setError("You do not have permission to access this page.");
          router.push("/users_datasets");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Failed to authenticate user.");
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [status, session, router]);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (user?.accessLevel !== "admin") {
    return null; // Redundant due to redirect, but kept for clarity
  }
    

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
                  <BreadcrumbLink href="/admin/institutions">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                    <BreadcrumbPage>
                        Institutions
                    </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        

        {/* Viewer */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min">
            <div className="p-4">
              <Institutions />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
