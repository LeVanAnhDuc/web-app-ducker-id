// libs
import { Types } from "mongoose";
// common
import { toDto } from "@/common/dto";
// dtos
import { AdminCategoryDto, PublicCategoryDto } from ".";

const id = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e1");

// A lean category as the repository returns it: the name subdocument may
// carry an `_id`, and internals sit next to the public fields.
const record = {
  _id: id,
  slug: "productivity",
  name: { en: "Productivity", vi: "Năng suất", _id: new Types.ObjectId() },
  sortOrder: 2,
  appCount: 5,
  __v: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z")
};

describe("AdminCategoryDto", () => {
  it("maps exactly the admin fields", () => {
    expect(toDto(AdminCategoryDto, record)).toStrictEqual({
      _id: id.toString(),
      slug: "productivity",
      name: { en: "Productivity", vi: "Năng suất" },
      sortOrder: 2,
      appCount: 5
    });
  });
});

describe("PublicCategoryDto", () => {
  it("maps id, slug and name only — no counts or ordering", () => {
    expect(toDto(PublicCategoryDto, record)).toStrictEqual({
      _id: id.toString(),
      slug: "productivity",
      name: { en: "Productivity", vi: "Năng suất" }
    });
  });

  it("maps a list", () => {
    expect(toDto(PublicCategoryDto, [record, record])).toHaveLength(2);
  });
});
