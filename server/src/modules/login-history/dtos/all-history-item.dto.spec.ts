// libs
import { Types } from "mongoose";
// common
import { toDto } from "@/common/dto";
// dtos
import { AllHistoryItemDto, HistoryDetailItemDto, MyHistoryItemDto } from ".";

const id = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e1");
const userId = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e2");
const createdAt = new Date("2026-10-15T07:00:00.000Z");

const record = {
  _id: id,
  userId,
  authId: new Types.ObjectId(),
  usernameAttempted: "user@test.com",
  method: "password",
  status: "success",
  ip: "203.0.113.7",
  country: "VN",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 11",
  browser: "Chrome 140",
  clientType: "WEB",
  userAgent: "Mozilla/5.0",
  timezoneOffset: "+07:00",
  isAnomaly: false,
  anomalyReasons: [],
  source: "idp",
  interactive: true,
  createdAt,
  __v: 0
};

const shared = {
  _id: id.toString(),
  method: "password",
  status: "success",
  failReason: null,
  country: "VN",
  city: "Hanoi",
  deviceType: "DESKTOP",
  os: "Windows 11",
  browser: "Chrome 140",
  clientType: "WEB",
  isAnomaly: false,
  createdAt: createdAt.toISOString(),
  source: "idp",
  app: null,
  interactive: true
};

describe("AllHistoryItemDto", () => {
  it("maps exactly the admin fields, IP unmasked", () => {
    expect(toDto(AllHistoryItemDto, record)).toStrictEqual({
      ...shared,
      ip: "203.0.113.7",
      userId: userId.toString(),
      usernameAttempted: "user@test.com",
      userAgent: "Mozilla/5.0",
      timezoneOffset: "+07:00",
      anomalyReasons: []
    });
  });

  it("is also the detail DTO", () => {
    expect(toDto(HistoryDetailItemDto, record)).toStrictEqual(
      toDto(AllHistoryItemDto, record)
    );
  });

  it("reports a failed attempt on an unknown account with userId null", () => {
    expect(toDto(AllHistoryItemDto, { ...record, userId: null }).userId).toBe(
      null
    );
  });
});

describe("MyHistoryItemDto", () => {
  it("maps exactly the owner fields — no user agent, no attempted username", () => {
    const dto = toDto(MyHistoryItemDto, record);
    expect(Object.keys(dto).sort()).toEqual(
      [...Object.keys(shared), "ip"].sort()
    );
    expect(dto.ip).not.toBe("203.0.113.7");
  });
});
