// types
import type { UserCategory } from "@/types/Apps";
// others
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

// Server-only: uses API_SERVER_URL (not exposed to browser). Sends NO auth
// header — the endpoint is public. Returns null on any failure so the caller
// can fall back to the client fetch instead of crashing the page.
export const getServerAppCategories = async (): Promise<
  UserCategory[] | null
> => {
  try {
    const res = await fetch(
      `${process.env.API_SERVER_URL}${process.env.NEXT_PUBLIC_API_PREFIX}${END_POINTS.APP_CATEGORIES}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ResponsePattern<UserCategory[]>;
    return json.data;
  } catch {
    return null;
  }
};
