import { PropsWithChildren } from "react";
import { ReactQueryProvider, ReactQueryProviderProps } from "./query-provider";
import { PreferenceProvider } from "./preference-provider";
import { ThemeProvider } from "./theme-provider";

export type ProvidersProps = PropsWithChildren<{
  query?: Omit<ReactQueryProviderProps, "children">;
}>;

export function Providers({ children }: ProvidersProps) {
  return (
    <ReactQueryProvider>
      <PreferenceProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </PreferenceProvider>
    </ReactQueryProvider>
  );
}
