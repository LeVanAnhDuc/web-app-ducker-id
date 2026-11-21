// libs
import { Types } from "mongoose";
// common
import { toDto } from "@/common/dto";
// dtos
import {
  AdminContactDetailItemDto,
  ContactDetailItemDto,
  ContactListItemDto,
  SubmitContactResponseDto,
  UpdateContactStatusDto
} from ".";

const id = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e1");
const userId = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e2");
const createdAt = new Date("2026-03-01T08:00:00.000Z");
const updatedAt = new Date("2026-03-02T09:30:00.000Z");

const record = {
  _id: id,
  userId,
  email: "user@example.com",
  subject: "Cannot sign in",
  message: "The OTP never arrives.",
  priority: "high",
  status: "open",
  ipAddress: "203.0.113.7",
  createdAt,
  updatedAt,
  __v: 0
};

const listRow = {
  _id: id.toString(),
  email: "user@example.com",
  subject: "Cannot sign in",
  priority: "high",
  status: "open",
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString()
};

describe("contact response DTOs", () => {
  it("ContactListItemDto has no message body", () => {
    expect(toDto(ContactListItemDto, record)).toStrictEqual(listRow);
  });

  it("UpdateContactStatusDto is the list row", () => {
    expect(toDto(UpdateContactStatusDto, record)).toStrictEqual(listRow);
  });

  it("ContactDetailItemDto adds the message, not who filed it", () => {
    expect(toDto(ContactDetailItemDto, record)).toStrictEqual({
      ...listRow,
      message: "The OTP never arrives."
    });
  });

  it("AdminContactDetailItemDto adds userId and ipAddress", () => {
    expect(toDto(AdminContactDetailItemDto, record)).toStrictEqual({
      ...listRow,
      message: "The OTP never arrives.",
      userId: userId.toString(),
      ipAddress: "203.0.113.7"
    });
  });

  it("AdminContactDetailItemDto reports a guest request with nulls", () => {
    const dto = toDto(AdminContactDetailItemDto, {
      ...record,
      userId: undefined,
      ipAddress: undefined,
      email: undefined
    });
    expect(dto).toMatchObject({ userId: null, ipAddress: null, email: null });
  });

  it("SubmitContactResponseDto answers with id, without updatedAt", () => {
    expect(toDto(SubmitContactResponseDto, record)).toStrictEqual({
      id: id.toString(),
      email: "user@example.com",
      subject: "Cannot sign in",
      message: "The OTP never arrives.",
      priority: "high",
      status: "open",
      createdAt: createdAt.toISOString()
    });
  });
});
