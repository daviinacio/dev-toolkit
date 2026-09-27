import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useActiveTool, useToolboxList } from "@/hooks/use-toolbox-list";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

/**
 * Laid out below the header like the design, so it's never fixed or collapsible.
 * On small screens it's hidden and the search (Ctrl+K) is the navigation.
 */
export function AppSidebar({ className }: { className?: string }) {
  const toolboxes = useToolboxList();
  const { toolbox: activeToolbox, tool: activeTool } = useActiveTool();
  const { pathname } = useLocation();
  const toolCount = toolboxes.reduce((sum, it) => sum + it.tools.length, 0);

  return (
    <Sidebar collapsible="none" className={cn("hidden border-r md:flex", className)}>
      <SidebarContent className="gap-0 py-2">
        <SidebarGroup>
          <SidebarGroupLabel>Toolboxes</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/"}>
                <Link to="/">All tools</Link>
              </SidebarMenuButton>
              <SidebarMenuBadge className="font-mono text-[10px] text-muted-foreground">
                {toolCount}
              </SidebarMenuBadge>
            </SidebarMenuItem>
            {toolboxes.map((toolbox) => (
              <SidebarMenuItem key={toolbox.path}>
                <SidebarMenuButton
                  asChild
                  isActive={activeToolbox?.path === toolbox.path && !activeTool}
                >
                  <Link to={`/${toolbox.path}`}>{toolbox.name}</Link>
                </SidebarMenuButton>
                <SidebarMenuBadge className="font-mono text-[10px] text-muted-foreground">
                  {toolbox.tools.length}
                </SidebarMenuBadge>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {activeToolbox && (
          <SidebarGroup>
            <SidebarGroupLabel>{activeToolbox.name}</SidebarGroupLabel>
            <SidebarMenu>
              {activeToolbox.tools.map((tool) => {
                const isActive = activeTool?.path === tool.path;
                return (
                  <SidebarMenuItem key={tool.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={`/${activeToolbox.path}/${tool.path}`}>
                        {isActive && (
                          <span className="size-1 shrink-0 rounded-full bg-primary" />
                        )}
                        <span>{tool.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Command line</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/cli")}>
                <Link to="/cli">Installation</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mx-2 border-t px-2 py-4">
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          Everything runs in your browser. Your data never leaves it.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
