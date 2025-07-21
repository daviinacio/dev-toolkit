import { Slot } from "@radix-ui/react-slot";
import { HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ForcedSizeProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: "auto" | "fit-h" | "fit-w" | "square-h" | "square-w";
  offsetHeight?: number;
  offsetWidth?: number;
};

export type Size = {
  wrapperHeight: number;
  wrapperWidth: number;
  contentHeight: number;
  contentWidth: number;
};

export function ForcedSize({
  children,
  className,
  style,
  variant = "auto",
  offsetHeight = 0,
  offsetWidth = 0,
  ...props
}: ForcedSizeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({
    wrapperHeight: 0,
    wrapperWidth: 0,
    contentHeight: 0,
    contentWidth: 0,
  });

  useEffect(() => {
    if (!wrapperRef.current) return;
    const content = wrapperRef.current.querySelector("& > div");
    if (!content) return;

    function handler() {
      if (!wrapperRef.current || !content) return;
      const newWrapperHeight = wrapperRef.current.offsetHeight;
      const newWrapperWidth = wrapperRef.current.offsetWidth;
      const contentComputed = getComputedStyle(content);
      const newContentHeight = parseInt(contentComputed.height);
      const newContentWidth = parseInt(contentComputed.width);

      setSize((prev) => {
        const nothingChanges =
          prev.wrapperHeight === newWrapperHeight &&
          prev.wrapperWidth === newWrapperWidth &&
          prev.contentHeight === newContentHeight &&
          prev.contentWidth === newContentWidth;
        if (!wrapperRef.current || nothingChanges) return prev;
        return {
          wrapperHeight: newWrapperHeight,
          wrapperWidth: newWrapperWidth,
          contentHeight: newContentHeight,
          contentWidth: newContentWidth,
        };
      });
    }
    handler();
    const wrapperObserver = new ResizeObserver(handler);
    const contentObserver = new ResizeObserver(handler);
    wrapperObserver.observe(wrapperRef.current);
    contentObserver.observe(content);
    return () => {
      wrapperObserver.disconnect();
      contentObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={cn("h-full w-full relative", className)}
      ref={wrapperRef}
      style={{
        ...style,
        ...(["square-h"].includes(variant) && {
          width: size.wrapperHeight,
          maxWidth: size.wrapperHeight,
        }),
        ...(["square-w"].includes(variant) && {
          height: size.wrapperWidth,
          maxHeight: size.wrapperWidth,
        }),
        ...(["fit-h"].includes(variant) && {
          width: size.contentWidth,
          maxWidth: size.contentWidth,
        }),
        ...(["fit-w"].includes(variant) && {
          height: size.contentHeight,
          maxHeight: size.contentHeight,
        }),
      }}
      {...props}
    >
      <div
        className="absolute"
        style={{
          ...(["auto", "fit-w", "square-h", "square-w"].includes(variant) && {
            left: 0,
            right: 0,
          }),
          ...(["auto", "fit-h", "square-h", "square-w"].includes(variant) && {
            top: 0,
            bottom: 0,
          }),
        }}
      >
        <Slot
          style={{
            ...(["auto", "fit-w"].includes(variant) && {
              width: size.wrapperWidth - offsetWidth,
              maxWidth: size.wrapperWidth - offsetWidth,
            }),
            ...(["auto", "fit-h"].includes(variant) && {
              height: size.wrapperHeight - offsetHeight,
              maxHeight: size.wrapperHeight - offsetHeight,
            }),
          }}
          className=" inset-0 h-full max-h-full"
        >
          {children}
        </Slot>
      </div>
    </div>
  );
}
