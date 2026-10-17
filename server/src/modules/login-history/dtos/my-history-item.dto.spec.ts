// types
import type { LoginHistoryDocument } from "@/modules/login-history/types";
// module under test
import { toMyHistoryItemDto } from "./my-history-item.dto";

const doc = (fields: Record<string, unknown>) =>
  ({
    _id: { toString: () => "64b7f0c2f1a2b3c4d5e6f7a8" },
    method: "password",
    status: "failed",
    failReason: "invalid_password",
    ip: "127.0.0.1",
    country: "LOCAL",
    city: "LOCAL",
    deviceType: "DESKTOP",
    os: "Ubuntu 24.04",
    browser: "Firefox 130",
    clientType: "WEB",
    createdAt: new Date("2026-10-15T07:00:00.000Z"),
    ...fields
  }) as unknown as LoginHistoryDocument;

describe("toMyHistoryItemDto", () => {
  it("carries the fail reason, the OS and the anomaly flag", () => {
    const result = toMyHistoryItemDto(doc({ isAnomaly: true }));

    expect(result).toEqual(
      expect.objectContaining({
        failReason: "invalid_password",
        os: "Ubuntu 24.04",
        isAnomaly: true
      })
    );
  });

  it("reports a row written before the flag existed as not anomalous", () => {
    expect(toMyHistoryItemDto(doc({})).isAnomaly).toBe(false);
  });
});
