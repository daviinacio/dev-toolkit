import { useContext } from "react";
import { PreferenceContext } from "@/providers/preference-provider";

export function usePreference(){
  const context = useContext(PreferenceContext);
  if (context === undefined)
    throw new Error('usePreference must be used within a PreferenceProvider');
  return context;
}
