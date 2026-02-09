"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated, getUserRole } from "@/lib/api";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { CreditBalance } from "@/components/billing/CreditBalance";
import { ThemeToggle } from "@/components/theme-toggle";

const routeLabels: Record<string, string> = {
  "/dashboard": "Overview",
  "/chat": "Chat",
  "/channels": "Channels",
  "/skills": "Skills",
  "/model": "Model",
  "/identity": "Identity",
  "/scheduled-tasks": "Scheduled Tasks",
  "/integrations": "Integrations",
  "/billing": "Billing",
  "/settings": "Settings",
  "/admin": "Admin Dashboard",
  "/admin/users": "Users",
  "/admin/tenants": "Tenants",
  "/admin/revenue": "Revenue",
  "/admin/pricing": "Pricing",
  "/admin/channels": "Channels",
  "/admin/config": "System Config",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  if (!mounted) return null;

  const pageTitle = routeLabels[pathname] || "Dashboard";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <CreditBalance />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
