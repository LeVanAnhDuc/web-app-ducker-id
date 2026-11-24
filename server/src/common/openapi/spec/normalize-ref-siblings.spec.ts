// others
import { normalizeRefSiblings } from "../normalize-ref-siblings";

describe("normalizeRefSiblings", () => {
  it("moves a $ref that has siblings into allOf, dropping a stray type object", () => {
    expect(
      normalizeRefSiblings({
        properties: {
          name: {
            type: "object",
            $ref: "#/components/schemas/NameDto",
            description: "The name"
          }
        }
      })
    ).toEqual({
      properties: {
        name: {
          description: "The name",
          allOf: [{ $ref: "#/components/schemas/NameDto" }]
        }
      }
    });
  });

  it("keeps a bare $ref and unrelated nodes as they are", () => {
    const node = {
      a: { $ref: "#/components/schemas/A" },
      b: { type: "string", description: "plain" },
      c: [{ $ref: "#/components/schemas/C" }]
    };
    expect(normalizeRefSiblings(node)).toEqual(node);
  });
});
