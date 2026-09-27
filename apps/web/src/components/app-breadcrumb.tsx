import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useActiveTool } from "@/hooks/use-toolbox-list";
import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";

/** Tools / Toolbox / Tool, built from the current route */
export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const { toolbox, tool } = useActiveTool();

  const items: Array<{ label: string; to: string }> = [{ label: "Tools", to: "/" }];
  if (pathname.startsWith("/cli")) items.push({ label: "CLI", to: "/cli" });
  if (toolbox) items.push({ label: toolbox.name, to: `/${toolbox.path}` });
  if (toolbox && tool)
    items.push({ label: tool.name, to: `/${toolbox.path}/${tool.path}` });

  return (
    <div className="flex h-10 shrink-0 items-center border-b px-6">
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, i) => (
            <Fragment key={item.to}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === items.length - 1 ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
