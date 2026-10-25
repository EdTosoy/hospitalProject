"use client";

import { BrandLogo } from "@/components/brand-logo";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    plan: string;
  }[];
}) {
  const activeTeam = teams[0];

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:p-0">
          <BrandLogo
            variant="symbol"
            className="hidden group-data-[collapsible=icon]:block"
          />
          <div className="grid min-w-0 flex-1 gap-1 text-left group-data-[collapsible=icon]:hidden text-sm leading-tight">
            <BrandLogo className="w-28" />
            <span className="truncate text-xs text-muted-foreground">
              {activeTeam.plan}
            </span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
