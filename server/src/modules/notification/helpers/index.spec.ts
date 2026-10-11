// helpers
import { isInternalLink } from "./index";

describe("isInternalLink", () => {
  it.each(["/profile", "/apps?search=Atlas%20Imagery", "/login-history"])(
    "accepts %p",
    (link) => expect(isInternalLink(link)).toBe(true)
  );

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "profile",
    ""
  ])("rejects %p", (link) => expect(isInternalLink(link)).toBe(false));
});
