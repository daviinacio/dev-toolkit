import { cn } from "@/lib/utils";
import { RootLayout } from ".";
import { Outlet } from "react-router-dom";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ToolHeader } from "@/components/tool-card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useActiveTool } from "@/hooks/use-toolbox-list";
import { CSSProperties, useEffect, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

type DocumentationLayoutProps = {
  className?: string;
};

export default function DocumentationLayout({
  className,
}: DocumentationLayoutProps) {
  const { toolbox, tool } = useActiveTool();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen((open) => !open);
      }
    }
    // Capture phase, so it also works while the code editor has focus
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <RootLayout className={cn("h-full", className)} appName="Developer Toolkit">
      <SidebarProvider
        className="h-full min-h-0 flex-col"
        style={{ "--sidebar-width": "13rem" } as CSSProperties}
      >
        <AppHeader onSearch={() => setSearchOpen(true)} />

        <div className="flex min-h-0 flex-1">
          <AppSidebar />

          <main className="flex min-w-0 flex-1 flex-col">
            <AppBreadcrumb />
            <div className="relative min-h-0 flex-1">
              <ScrollArea fit>
                {toolbox && tool ? (
                  <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
                    <ToolHeader toolbox={toolbox} tool={tool} />
                    <Outlet />
                  </div>
                ) : (
                  <Outlet />
                )}
              </ScrollArea>
            </div>
          </main>
        </div>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarProvider>
    </RootLayout>
  );
}
