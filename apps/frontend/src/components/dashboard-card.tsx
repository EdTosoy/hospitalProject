import Link from "next/link";
import React from "react";

type Props = {
  title: string;
  description: string;
  href: string;
};

export default function DashboardCard({ title, description, href }: Props) {
  return (
    <Link
      href={href}
      className="block p-6 border rounded-lg hover:bg-muted transition-colors"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}
