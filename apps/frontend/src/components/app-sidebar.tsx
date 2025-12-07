"use client";

import * as React from "react";
import {
  CalendarDays,
  GalleryVerticalEnd,
  ListOrdered,
  SquareTerminal,
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

// This is sample data.
const data = {
  user: {
    name: "Dr. Smith",
    email: "smith@pulse.hospital",
    avatar: "/avatars/doctor.jpg",
  },
  teams: [
    {
      name: "Pulse Hospital",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
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
    {
      title: "Queue",
      url: "/dashboard/queue",
      icon: ListOrdered,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
