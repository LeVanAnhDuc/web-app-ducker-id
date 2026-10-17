// others
import { openApiSpec } from "./openapi";

const collectRefs = (node: unknown, refs: Set<string>): Set<string> => {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, refs));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") refs.add(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
};

describe("openApiSpec", () => {
  const documented = Object.keys(openApiSpec.paths);

  it.each([
    "/auth/login",
    "/auth/unlock",
    "/users/me",
    "/users/me/favorites",
    "/users/me/recent-apps",
    "/login-history",
    "/admin/login-history",
    "/notifications",
    "/contacts",
    "/admin/contacts",
    "/admin/apps",
    "/admin/categories"
  ])("documents %s", (prefix) => {
    expect(
      documented.some((p) => p === prefix || p.startsWith(`${prefix}/`))
    ).toBe(true);
  });

  it("resolves every local $ref", () => {
    const unresolved = [...collectRefs(openApiSpec, new Set())].filter(
      (ref) =>
        ref
          .slice(2)
          .split("/")
          .reduce<unknown>(
            (node, part) =>
              (node as Record<string, unknown> | undefined)?.[part],
            openApiSpec
          ) === undefined
    );
    expect(unresolved).toEqual([]);
  });
});
