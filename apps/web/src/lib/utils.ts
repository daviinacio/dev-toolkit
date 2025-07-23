import { type ClassValue, clsx } from "clsx";
import { ReactElement, ReactNode, cloneElement } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function joinJSX(nodeList: ReactElement[], separator: ReactElement) {
  return nodeList
    .map((child, i) =>
      cloneElement(child as ReactElement, { key: i, ...child.props })
    )
    .reduce((acc, child, i) => {
      if (i === 0) return [child];
      //@ts-ignore
      return [
        ...acc,
        cloneElement(separator, { key: `separator-${i}` }),
        child,
      ];
    }, [] as ReactNode[]);
}
