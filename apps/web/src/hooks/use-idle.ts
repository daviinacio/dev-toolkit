import { useEffect, useState } from "react";

export type UseIdleProps = {
  onIdle: () => void;
  interval: number;
  watch: React.DependencyList;
  repeat?: boolean;
  triggerOnMonth?: boolean;
};

export function useIdle({
  onIdle,
  interval,
  watch,
  repeat = false,
  triggerOnMonth = false,
}: UseIdleProps) {
  const [ready, setReady] = useState(triggerOnMonth);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(false), interval);
    return () => clearTimeout(timeout);
  }, [interval, repeat]);

  useEffect(() => {
    const it = (repeat ? setInterval : setTimeout)(() => {
      ready && onIdle && onIdle();
      setReady(true);
    }, interval);
    return () => (repeat ? clearInterval : clearTimeout)(it);
  }, [...Array.from(watch || []), interval, repeat]);
  return {};
}
