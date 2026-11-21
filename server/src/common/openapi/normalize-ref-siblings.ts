/**
 * OpenAPI 3.0 ignores every sibling of a `$ref`, so `{ $ref, description }`
 * loses its description in Swagger UI. The schema generator emits exactly that
 * (plus a stray `type: "object"`) for a nested request DTO property that
 * carries `@ApiProperty({ description })`, so each such node becomes
 * `{ description, allOf: [{ $ref }] }`. A bare `{ $ref }` is untouched.
 */
export const normalizeRefSiblings = <T>(node: T): T => {
  if (Array.isArray(node)) return node.map(normalizeRefSiblings) as T;
  if (!node || typeof node !== "object") return node;

  const entries = Object.entries(node as Record<string, unknown>);
  const ref = (node as { $ref?: unknown }).$ref;
  if (typeof ref !== "string" || entries.length === 1) {
    return Object.fromEntries(
      entries.map(([key, value]) => [key, normalizeRefSiblings(value)])
    ) as T;
  }

  const siblings = entries.filter(
    ([key, value]) => key !== "$ref" && !(key === "type" && value === "object")
  );
  return {
    ...Object.fromEntries(siblings),
    allOf: [{ $ref: ref }]
  } as T;
};
