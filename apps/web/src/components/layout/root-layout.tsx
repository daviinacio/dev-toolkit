import { useRoutePaths } from "@/hooks";
import { cn } from "@/lib/utils";
import { capitalize } from "common/lib/utils";
import { PropsWithChildren, useEffect } from "react";

type RootLayoutProps = PropsWithChildren<{
  className?: string;
  appName?: string;
}>;

export function RootLayout({ children, className, appName }: RootLayoutProps) {
  const routePaths = useRoutePaths({});

  useEffect(() => {
    const route = routePaths[routePaths.length - 1];
    if (!route) return;

    const titlePart = [
      route.isCuid
        ? `${capitalize(route.parts[route.parts.length - 2])} Detail`
        : route.label,
    ];

    if (appName) titlePart.push(appName);

    document.title = titlePart.join(" · ");

    if (process.env.NODE_ENV === "development") document.title += " ≈ [dev]";
  }, [routePaths]);

  return (
    <div
      className={cn(
        "min-h-full flex w-full flex-col bg-zinc-50 dark:bg-zinc-900/50",
        className
      )}
    >
      {children}
    </div>
  );
}
