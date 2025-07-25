import { cn } from "@/lib/utils";
import { RootLayout } from ".";
import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
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
import { ScrollArea } from "../ui/scroll-area";

type DocumentationLayoutProps = {
  className?: string;
};

export default function DocumentationLayout({
  className,
}: DocumentationLayoutProps) {
  const children = <Outlet />;

  return (
    <RootLayout className={cn(className)} appName="Developer Toolkit">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
            <div className="flex items-center gap-2 px-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                      TODO: Implement Breadcrumb
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>...</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="relative pr-0.5 flex-1 h-full">
            <ScrollArea fit>
              <div className="p-4 pr-3.5">{children}</div>
            </ScrollArea>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </RootLayout>
  );
}
