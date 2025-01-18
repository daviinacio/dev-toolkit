import { cn } from "@/lib/utils";
import { RootLayout } from ".";
import { Outlet } from "react-router-dom";

type DocumentationLayoutProps = {
  className?: string;
};

export default function DocumentationLayout({
  className,
}: DocumentationLayoutProps) {
  const children = <Outlet />;

  return (
    <RootLayout className={cn(className)} appName="Developer Toolkit">
      <div className="p-4 relative flex-1 h-full">{children}</div>
    </RootLayout>
  );
}
