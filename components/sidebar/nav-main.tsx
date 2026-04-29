"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Label } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  url?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavItem[];
  isMask?: boolean;
  maskId?: string;
  defaultChecked?: boolean; // Added to support initial state
};

// Added onMaskToggle to the props
export function NavMain({ 
  items, 
  onMaskToggle 
}: { 
  items: NavItem[], 
  onMaskToggle?: (maskId: string, isVisible: boolean) => void 
}) {
  const pathname = usePathname();

  const renderItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon as LucideIcon | undefined;
    const active =
      (item.url && pathname === item.url) ||
      item.isActive ||
      (item.items?.some((c) => c.url && pathname === c.url) ?? false);

    // --- MASK RENDERING (With Checkbox) ---
    if (item.isMask) {
      return (
        <SidebarMenuItem 
          key={item.maskId || item.title} 
          className="flex items-center gap-2 px-8 py-1.5 hover:bg-accent/50 rounded-md transition-colors"
        >
          <Checkbox 
            id={item.maskId} 
            defaultChecked={item.defaultChecked}
            onCheckedChange={(checked) => {
              if (onMaskToggle && item.maskId) {
                onMaskToggle(item.maskId, !!checked);
              }
            }}
          />
          <Label 
            htmlFor={item.maskId} 
            className="text-xs font-medium leading-none cursor-pointer select-none flex-1 py-1"
          >
            {item.title}
          </Label>
        </SidebarMenuItem>
      );
    }

    // --- STANDARD NAVIGATION RENDERING ---
    const buttonContent = (
      <SidebarMenuButton
        tooltip={item.title}
        className={depth > 0 ? "pl-8" : undefined}
        asChild={!!item.url && item.url !== "#"}
      >
        {item.url && item.url !== "#" ? (
          <Link href={item.url}>
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            <span className="truncate">{item.title}</span>
          </Link>
        ) : (
          <div className="flex items-center">
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            <span className="truncate">{item.title}</span>
          </div>
        )}
      </SidebarMenuButton>
    );

    return (
      <React.Fragment key={`${item.title}-${item.url}-${depth}`}>
        <SidebarMenuItem data-active={active ? "true" : undefined}>
          {buttonContent}
        </SidebarMenuItem>
        {item.items && item.items.length > 0
          ? item.items.map((child) => renderItem(child, depth + 1))
          : null}
      </React.Fragment>
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => renderItem(item))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}