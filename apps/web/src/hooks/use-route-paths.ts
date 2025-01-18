import { useQueryClient } from "@tanstack/react-query";
import { capitalize, checkIsCuid } from "common/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

export type RouteItem = {
  pathname: string;
  parts: Array<string>;
  path: string;
  isCuid?: boolean;
  label?: string;
}

export type UseRoutePathsProps = {
  home?: RouteItem
}

const refreshInterval = 100;
const maxAttempts = 75;

export function useRoutePaths({
   home
}: UseRoutePathsProps){
  const [refresh, setRefresh] = useState(false);
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache().getAll();
  const [shouldRefresh, setShouldRefresh] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if(!shouldRefresh) return;
    const interval = setInterval(() => setRefresh(r => !r), refreshInterval);
    return () => clearInterval(interval);
  }, [shouldRefresh]);

  useEffect(() => {
    setAttempts((prev) => {
      if(attempts >= maxAttempts) {
        setShouldRefresh(false);
        return prev;
      }
      return ++prev;
    });
  }, [refresh]);

  useEffect(() => setAttempts(0), [pathname]);

  const routes = useMemo<Array<RouteItem>>(() => [home as RouteItem].filter(p => p).concat(pathname
    .split('/')
    .filter(p => p)
    .map((path, i, arr) => {
      const parts = arr.slice(0, i + 1);

      const isCuid = checkIsCuid(path);
      const isNew = path === 'new';
      const isNextCuid = checkIsCuid(arr[i + 1]);
      const isNextNew = arr[i + 1] === 'new';
      
      const pathname = `/${parts.map((p, j, arr) => {
        if(j < arr.length && !arr[j + 1] && (isNextCuid || isNextNew))
          return p.endsWith('s') ? p : p + 's';
        return p;
      }).join('/')}`;

      const label = isNew ?
        `Create ${(arr[i -1]).toLowerCase()}`:
        `${capitalize( isNextCuid || isNextNew ?
          path.endsWith('s') ? path : path + 's' : path
        )}`.replaceAll('-', ' ')

      return {
        label,
        pathname,
        path,
        parts,
        isCuid
      } 
    })) , [pathname]);

  const cache = useMemo(() => {
    const pathQueries = pathname.split('/')
      .filter(p => p)
      .reduce((acc, path, i, arr) => {
        if(!checkIsCuid(arr[i + 1])) return acc;
        acc.push({
          domain: path.endsWith('s') ? path : path + 's',
          id: arr[i + 1]
        });
        return acc;
      }, [] as Array<{ domain: string, id: string }>);

    const pathsCache = pathQueries.map(pathQuery => {
      const cache = queryCache.find((query) => {
        const trpcPath = query.queryKey[0];
        const trpcOptions = query.queryKey[1] as any;
        if(!Array.isArray(trpcPath) || typeof trpcOptions !== 'object' || !trpcOptions) return false;
        return(
          trpcPath.slice(0, -1).includes(pathQuery.domain) && trpcPath[trpcPath.length -1] === 'get' &&
          trpcOptions.input && trpcOptions.input.id === pathQuery.id
        );
      });

      return Object.assign(pathQuery, {
        record: cache?.state.data
      });
    });

    // Stop refresh if all paths are cached
    setShouldRefresh(!pathsCache.every(p => p.record));

    return pathsCache;
  }, [pathname, refresh]);

  const data = useMemo<Array<RouteItem>>(() => {
    return routes.map((route, i, arr) => {
      if(!checkIsCuid(route.path) || !cache.length) return route;
      const domainPath = arr[i - 1].path;
      const cacheItem = cache.find(c => c.domain === (domainPath.endsWith('s') ? domainPath : domainPath + 's'));

      return Object.assign(route, {
        // @ts-ignore
        label: cacheItem?.record?.name || (!shouldRefresh && "[ERROR]")
      })
    });
  }, [routes, cache, shouldRefresh]);
  
  return data;
}
