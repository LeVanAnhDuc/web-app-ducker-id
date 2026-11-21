// libs
import { Types } from "mongoose";
// common
import { toDto } from "@/common/dto";
// dtos
import { MyProfileDto, PublicProfileDto } from ".";

const id = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e1");
const createdAt = new Date("2026-01-10T10:00:00.000Z");

const record = {
  _id: id,
  authId: new Types.ObjectId(),
  email: "user@test.com",
  fullName: "Nguyen Van A",
  phone: "+84 912 345 678",
  avatar: "https://cdn.example.com/a.png",
  address: "1 Le Loi",
  dateOfBirth: new Date("1995-06-15T00:00:00.000Z"),
  gender: "male",
  createdAt,
  updatedAt: createdAt,
  __v: 0
};

describe("MyProfileDto", () => {
  it("maps exactly the profile fields", () => {
    expect(toDto(MyProfileDto, record)).toStrictEqual({
      _id: id.toString(),
      fullName: "Nguyen Van A",
      phone: "+84 912 345 678",
      avatar: "https://cdn.example.com/a.png",
      address: "1 Le Loi",
      dateOfBirth: "1995-06-15T00:00:00.000Z",
      gender: "male",
      email: "user@test.com",
      createdAt: createdAt.toISOString()
    });
  });

  it("reports unset optional fields as null", () => {
    const dto = toDto(MyProfileDto, {
      _id: id,
      fullName: "B",
      email: "b@test.com",
      createdAt
    });
    expect(dto).toMatchObject({
      phone: null,
      avatar: null,
      address: null,
      dateOfBirth: null,
      gender: null
    });
  });
});

describe("PublicProfileDto", () => {
  it("shows another user only id, name, avatar and gender", () => {
    expect(toDto(PublicProfileDto, record)).toStrictEqual({
      _id: id.toString(),
      fullName: "Nguyen Van A",
      avatar: "https://cdn.example.com/a.png",
      gender: "male"
    });
  });
});
