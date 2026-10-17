import type { EnvName } from "./env";

// Tags filtered out per run. `@e2e-full` (cross-module journeys) runs only with
// `pnpm test:full`. Ducker ID has no shared stg/prd, so there is no
// `@creates-data` block — every run is on a dedicated, seeded database.
export function buildGrepInvert(
  _env: EnvName,
  includeFull: boolean
): RegExp | undefined {
  return includeFull ? undefined : /@e2e-full/;
}
