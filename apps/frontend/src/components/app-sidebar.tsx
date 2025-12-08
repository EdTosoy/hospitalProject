"use client";

import * as React from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  CalendarDays,
  GalleryVerticalEnd,
  Home,
  ListOrdered,
  User,
  Users,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const teams = [
  {
    name: "Pulse Hospital",
    logo: GalleryVerticalEnd,
    plan: "Enterprise",
  },
];

function getNavItem(role: string | undefined) {
  const common = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
  ];

  switch (role) {
    case "PATIENT":
      return [
        ...common,
        {
          title: "My Appointments",
          url: "/dashboard/appointment",
          icon: CalendarDays,
        },
        {
          title: "My Profile",
          url: "/dashboard/profile",
          icon: User,
        },
      ];
    case "DOCTOR":
      return [
        ...common,
        {
          title: "Schedule",
          url: "/dashboard/appointment",
          icon: CalendarDays,
        },
        {
          title: "Patients",
          url: "/dashboard/patients",
          icon: Users,
        },
        {
          title: "Queue",
          url: "/dashboard/queue",
          icon: ListOrdered,
        },
      ];
    default:
      return [
        ...common,
        {
          title: "Queue",
          url: "/dashboard/queue",
          icon: ListOrdered,
        },
        {
          title: "Appointments",
          url: "/dashboard/appointment",
          icon: CalendarDays,
        },
        {
          title: "Patients",
          url: "/dashboard/patients",
          icon: Users,
        },
      ];
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore();
  const navItems = getNavItem(user?.role);

  const sidebarUser = {
    name: user?.name || user?.role || "User",
    email: user?.email || "guest@pulse.hospital",
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || "Guest")}&background=01bfa5&color=fff`,
  };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
