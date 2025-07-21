import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

import { cn } from "@/lib/utils";
import { ForcedSize } from "@/components/ui/forced-size";
import { useIdle } from "@/hooks/use-idle";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    orientation?: "vertical" | "horizontal";
    scrollBarClassName?: HTMLDivElement["className"];
    fit?: boolean;
    onScrollToEnd?: () => void;
    endScrollOffset?: number;
  }
>(
  (
    {
      className,
      children,
      orientation = "vertical",
      scrollBarClassName,
      fit = false,
      onScrollToEnd,
      endScrollOffset = 120,
      ...props
    },
    ref
  ) => {
    const scrollRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => scrollRef.current!, []);

    const [scrolledToEnd, setScrolledToEnd] = React.useState(true);

    useIdle({
      onIdle: () => {
        scrolledToEnd && onScrollToEnd && onScrollToEnd();
      },
      interval: 10,
      watch: [scrolledToEnd],
    });

    // React.useEffect(() => {
    //   setTimeout(() => setScrolledToEnd(false), 50);
    //   console.log("children changed");
    // }, [children]);

    React.useEffect(() => {
      if (!onScrollToEnd || !scrollRef.current) return;
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (!viewport) return;

      const handleScroll = () => {
        if (!scrollRef.current) return;

        if (
          orientation === "vertical" &&
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            endScrollOffset
        ) {
          setScrolledToEnd(true);
        } else if (
          orientation === "horizontal" &&
          viewport.scrollWidth - viewport.scrollLeft - viewport.clientWidth <
            endScrollOffset
        ) {
          setScrolledToEnd(true);
        } else {
          setScrolledToEnd(false);
        }
      };
      handleScroll();
      viewport.addEventListener("scroll", handleScroll);
      return () => {
        viewport.removeEventListener("scroll", handleScroll);
      };
    }, [
      scrollRef.current,
      onScrollToEnd,
      orientation,
      endScrollOffset,
      scrolledToEnd,
    ]);

    return (
      <ForcedSize
        className={cn("relative ", className)}
        variant={
          fit ? "auto" : orientation === "horizontal" ? "fit-w" : "fit-h"
        }
      >
        <ScrollAreaPrimitive.Root
          ref={scrollRef}
          className="relative"
          {...props}
        >
          <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
            {children}
          </ScrollAreaPrimitive.Viewport>
          <ScrollBar orientation={orientation} className={scrollBarClassName} />
          <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
      </ForcedSize>
    );
  }
);
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
