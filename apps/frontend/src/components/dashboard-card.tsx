import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
  icon?: LucideIcon;
  count?: number;
}

export default function DashboardCard({
  title,
  description,
  href,
  icon: Icon,
  count,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group block p-6 border rounded-xl bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold group-hover:text-accent-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {Icon && (
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {count !== undefined && (
        <div className="mt-4 pt-4 border-t">
          <span className="text-2xl font-bold">{count}</span>
          <span className="text-sm text-muted-foreground ml-1">items</span>
        </div>
      )}
    </Link>
  );
}
