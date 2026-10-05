"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.url === "/dashboard"
              ? [
                  "/dashboard",
                  "/dashboard/patient",
                  "/dashboard/doctor",
                  "/dashboard/staff",
                ].includes(pathname)
              : pathname === item.url ||
                (item.url === "/dashboard/patients" &&
                  pathname.startsWith("/dashboard/consult/"));
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                className={
                  isActive ? "min-h-11 bg-primary/10 text-primary" : "min-h-11"
                }
              >
                <Link
                  href={item.url}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  {item.icon && (
                    <item.icon
                      className={
                        isActive ? "text-primary" : "text-muted-foreground"
                      }
                    />
                  )}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
