// types
import type { OpenAPIV3 } from "openapi-types";
// others
import { normalizePathKeys } from "../normalize-path-keys";

const doc = (paths: OpenAPIV3.PathsObject): OpenAPIV3.Document => ({
  openapi: "3.0.3",
  info: { title: "t", version: "1" },
  paths
});

describe("normalizePathKeys", () => {
  it('turns "/a/" into "/a" and leaves "/" alone', () => {
    const get = { responses: {} };
    expect(
      normalizePathKeys(doc({ "/a/": { get }, "/b": { get }, "/": { get } }))
        .paths
    ).toEqual({ "/a": { get }, "/b": { get }, "/": { get } });
  });

  it("merges two keys that collapse onto one when their verbs are disjoint", () => {
    const get = { responses: {} };
    const post = { responses: {} };
    expect(
      normalizePathKeys(doc({ "/a/": { get }, "/a": { post } })).paths
    ).toEqual({ "/a": { get, post } });
  });

  it("throws when two keys that collapse onto one define the same verb", () => {
    const get = { responses: {} };
    expect(() =>
      normalizePathKeys(doc({ "/a/": { get }, "/a": { get } }))
    ).toThrow(
      'OpenAPI paths "/a/" and "/a" collide once normalised to "/a" (both define get)'
    );
  });
});
