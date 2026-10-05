"use client";

import {
  CalendarDays,
  CreditCard,
  GalleryVerticalEnd,
  Home,
  ListOrdered,
  User,
  Users,
} from "lucide-react";
import type * as React from "react";
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
import { roleLabels } from "@/components/workspace-header";
import { useAuthStore } from "@/stores/auth-store";

const teams = [
  {
    name: "Pulse Medical",
    logo: GalleryVerticalEnd,
    plan: "Care, connected",
  },
];

function getNavItem(
  role: string | undefined,
): React.ComponentProps<typeof NavMain>["items"] {
  const common = [
    {
      title: "Overview",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
  ];

  const billing = {
    title: "Billing",
    url: "/dashboard/billing",
    icon: CreditCard,
  };
  switch (role) {
    case "BILLING":
      return [...common, billing];
    case "ADMIN":
      return [...getNavItem("FRONT_DESK"), billing];
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
    avatar: "",
  };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={teams.map((team) => ({
            ...team,
            plan: roleLabels[user?.role || ""] || team.plan,
          }))}
        />
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
