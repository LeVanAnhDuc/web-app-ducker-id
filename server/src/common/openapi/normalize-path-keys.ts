// types
import type { OpenAPIV3 } from "openapi-types";

/**
 * The one post-processing step on the generated document. The library joins
 * prefix, controller route and action route as written, so an action declared
 * `@Get("/")` comes out as `/users/me/favorites/`, while `mountControllers`
 * strips that slash. Two keys that collapse onto one would lose an operation,
 * so that throws instead.
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
      throw new Error(
        `OpenAPI paths "${earlier}" and "${key}" collide once normalised to "${normalised}"`
      );
    }
    from.set(normalised, key);
    paths[normalised] = item;
  }
  return { ...spec, paths };
};
