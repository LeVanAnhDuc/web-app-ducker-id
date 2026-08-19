// libs
import { create } from "zustand";
// types
import type { AuthStore } from "@/types/stores";
// slices
import createAuthSlice from "./slices/auth";

export const useAuthStore = create<AuthStore>()((...props) => ({
  ...createAuthSlice(...props)
}));
