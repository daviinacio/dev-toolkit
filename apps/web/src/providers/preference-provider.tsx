import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";

export type Preferences = {
  theme: "system" | "light" | "dark";
  locale: string;
  "sidebar-open": boolean;
};

const defaultPreferences: Preferences = {
  theme: "system",
  locale: "system",
  "sidebar-open": true,
};

const storageKey = "preferences";

export interface PreferenceContextProps {
  setItem: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  getItem: <K extends keyof Preferences>(key: K) => Preferences[K];
  resetItem: <K extends keyof Preferences>(key: K) => void;
}

export const PreferenceContext = createContext<
  PreferenceContextProps | undefined
>(undefined);

function deserializePreferences(): Preferences {
  const data = localStorage.getItem(storageKey);
  return data ? JSON.parse(data) : defaultPreferences;
}

export function PreferenceProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<Preferences>(deserializePreferences());

  // useEffect(() => console.log("changed to:", data), [data]);

  useEffect(() => {
    if (!data) return;
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    function storageHandler(event: StorageEvent) {
      console.log("storage event");
      if (event.key === storageKey) {
        setData(deserializePreferences());
      }
    }

    window.addEventListener("storage", storageHandler);
    return () => window.removeEventListener("storage", storageHandler);
  }, []);

  const setItem = useCallback<PreferenceContextProps["setItem"]>(
    (key, value) =>
      setData((data) => ({
        ...defaultPreferences,
        ...data,
        [key]: value,
      })),
    []
  );

  const getItem = useCallback<PreferenceContextProps["getItem"]>(
    (key) => data[key],
    [data]
  );

  const resetItem = useCallback<PreferenceContextProps["resetItem"]>(
    (key) => setItem(key, defaultPreferences[key]),
    [data]
  );

  return (
    <PreferenceContext.Provider
      value={{
        setItem,
        getItem,
        resetItem,
      }}
    >
      {children}
    </PreferenceContext.Provider>
  );
}
