/**
 * React context for the TypeDB Studio view model.
 *
 * Provides access to the root VM throughout the component tree.
 */

import { createContext, useContext } from "react";
import type { TypeDBStudioAppVM } from "./app.vm";

export const StudioVMContext = createContext<TypeDBStudioAppVM | null>(null);

export const useStudioVM = () => {
  const vm = useContext(StudioVMContext);
  if (!vm) throw new Error("useStudioVM must be used within StudioVMProvider");
  return vm;
};
