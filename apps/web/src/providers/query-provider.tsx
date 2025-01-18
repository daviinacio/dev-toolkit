import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PropsWithChildren, useMemo } from "react";

export type ReactQueryProviderProps = PropsWithChildren<{
  client?: QueryClient;
}>;

export function ReactQueryProvider({
  children,
  client,
}: ReactQueryProviderProps) {
  const queryClient = useMemo(
    () =>
      client ||
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchIntervalInBackground: false,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            staleTime: 60 * 1000,
            refetchInterval: 5 * 60 * 1000,
          },
          mutations: {},
        },
      }),
    [client]
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
}
