// libs
import { useCallback, useReducer } from "react";
// types
import type {
  CategoryReassignment,
  OrphanApp,
  ReassignState
} from "@/types/AdminCategories";

type Action =
  | { type: "bulk"; categoryId: string }
  | { type: "override"; appId: string; categoryId: string }
  | { type: "prune"; validIds: Set<string> }
  | { type: "reset" };

const EMPTY: ReassignState = { bulk: "", overrides: {} };

/**
 * One shared target plus per-app overrides (DR-5b). An app's target is its
 * override, else the shared one. Choosing "" on a row drops its override;
 * choosing a value equal to the shared one is still an override (DR-18).
 */
const reducer = (state: ReassignState, action: Action): ReassignState => {
  switch (action.type) {
    case "bulk":
      return { ...state, bulk: action.categoryId };
    case "override": {
      const overrides = { ...state.overrides };
      if (action.categoryId) overrides[action.appId] = action.categoryId;
      else delete overrides[action.appId];
      return { ...state, overrides };
    }
    case "prune": {
      // Targets deleted in another tab are dropped, not silently kept.
      const keep = (id: string) => action.validIds.has(id);
      return {
        bulk: keep(state.bulk) ? state.bulk : "",
        overrides: Object.fromEntries(
          Object.entries(state.overrides).filter(([, id]) => keep(id))
        )
      };
    }
    case "reset":
      return EMPTY;
  }
};

const useReassignState = () => {
  const [state, dispatch] = useReducer(reducer, EMPTY);

  const targetOf = useCallback(
    (appId: string) => state.overrides[appId] ?? state.bulk,
    [state]
  );

  const toReassignments = useCallback(
    (orphans: OrphanApp[]): CategoryReassignment[] =>
      orphans.map((app) => ({ appId: app._id, categoryId: targetOf(app._id) })),
    [targetOf]
  );

  return {
    state,
    targetOf,
    toReassignments,
    setBulk: (categoryId: string) => dispatch({ type: "bulk", categoryId }),
    setOverride: (appId: string, categoryId: string) =>
      dispatch({ type: "override", appId, categoryId }),
    prune: (validIds: Set<string>) => dispatch({ type: "prune", validIds }),
    reset: () => dispatch({ type: "reset" })
  };
};

export default useReassignState;
