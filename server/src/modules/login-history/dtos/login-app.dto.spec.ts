// types
import type { LoginHistoryDocument } from "@/modules/login-history/types";
// module under test
import { toLoginAppFieldsDto } from "./login-app.dto";

const WEB_APP_ID = "64b7f0c2f1a2b3c4d5e6f7c1";

const doc = (fields: Record<string, unknown>) =>
  fields as unknown as LoginHistoryDocument;

describe("toLoginAppFieldsDto", () => {
  it("treats a row written before the app fields existed as an interactive IdP login", () => {
    expect(toLoginAppFieldsDto(doc({}))).toEqual({
      source: "idp",
      app: null,
      interactive: true
    });
  });

  it("uses the populated web app for an OAuth sign-in", () => {
    const result = toLoginAppFieldsDto(
      doc({
        source: "oauth",
        interactive: false,
        clientName: "Old Name",
        webAppId: {
          _id: { toString: () => WEB_APP_ID },
          displayName: "Match CV",
          iconUrl: "https://cdn.example.com/match-cv.png"
        }
      })
    );

    expect(result).toEqual({
      source: "oauth",
      interactive: false,
      app: {
        id: WEB_APP_ID,
        name: "Match CV",
        iconUrl: "https://cdn.example.com/match-cv.png"
      }
    });
  });

  it("falls back to the name snapshot when the app was deleted", () => {
    const result = toLoginAppFieldsDto(
      doc({
        source: "oauth",
        interactive: true,
        clientName: "Shorten Link",
        webAppId: null
      })
    );

    expect(result.app).toEqual({
      id: null,
      name: "Shorten Link",
      iconUrl: null
    });
  });

  it("drops app info for an IdP row even if a stray ref is present", () => {
    const result = toLoginAppFieldsDto(
      doc({ source: "idp", webAppId: WEB_APP_ID, interactive: true })
    );

    expect(result.app).toBeNull();
  });
});
