// types
import type { OpenAPIV3 } from "openapi-types";

/**
 * Strips the trailing slash from path keys. The library joins prefix,
 * controller route and action route as written, so an action declared
 * `@Get("/")` comes out as `/users/me/favorites/`, while `mountControllers`
 * strips that slash. Two keys that collapse onto one are merged when their
 * verbs are disjoint; the same verb on both would lose an operation, so that
 * throws instead.
 */
export const normalizePathKeys = <T extends { paths: OpenAPIV3.PathsObject }>(
  spec: T
): T => {
  const paths: OpenAPIV3.PathsObject = {};
  const from = new Map<string, string>();

  for (const [key, item] of Object.entries(spec.paths)) {
    const normalised = key.length > 1 ? key.replace(/\/+$/, "") : key;
    const earlier = from.get(normalised);
    if (earlier !== undefined) {
      const existing = paths[normalised] as Record<string, unknown>;
      const clash = Object.keys(item ?? {}).find((verb) => verb in existing);
      if (clash !== undefined) {
        throw new Error(
          `OpenAPI paths "${earlier}" and "${key}" collide once normalised to "${normalised}" (both define ${clash})`
        );
      }
      paths[normalised] = { ...existing, ...item };
      continue;
    }
    from.set(normalised, key);
    paths[normalised] = item;
  }
  return { ...spec, paths };
};
