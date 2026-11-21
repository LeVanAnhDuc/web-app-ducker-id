// libs
import { Types } from "mongoose";
// common
import {
  Expose,
  ExposeDate,
  ExposeFrom,
  ExposeId,
  ExposeOrNull,
  toDto
} from "@/common/dto";

const id = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e1");
const otherId = new Types.ObjectId("64f1b2c3d4e5f6a7b8c9d0e2");
const createdAt = new Date("2026-01-02T03:04:05.000Z");

class NameDto {
  @Expose() en!: string;
  @Expose() vi!: string;
}

class SampleDto {
  @ExposeId() _id!: string;
  @ExposeId("_id") id!: string;
  @ExposeId() ownerId!: string | null;
  // An array of ObjectIds: bare @Expose would walk each one as an object.
  @ExposeFrom((src) => (src.tagIds as unknown[]).map(String)) tagIds!: string[];
  @Expose() title!: string;
  @ExposeOrNull() note!: string | null;
  @ExposeDate() createdAt!: string;
  @ExposeDate() readAt!: string | null;
  @ExposeFrom((src) => toDto(NameDto, src.name as object)) name!: NameDto;
  @ExposeFrom((src) => (src.count as number | undefined) ?? 0) count!: number;
}

const source = {
  _id: id,
  ownerId: undefined,
  tagIds: [id, otherId],
  title: "Hello",
  createdAt,
  name: { en: "Tools", vi: "Công cụ", _id: otherId },
  passwordHash: "secret",
  __v: 0
};

const expected = {
  _id: id.toString(),
  id: id.toString(),
  ownerId: null,
  tagIds: [id.toString(), otherId.toString()],
  title: "Hello",
  note: null,
  createdAt: createdAt.toISOString(),
  readAt: null,
  name: { en: "Tools", vi: "Công cụ" },
  count: 0
};

describe("toDto", () => {
  it("maps a plain (lean) record to exactly the exposed keys", () => {
    expect(toDto(SampleDto, source)).toStrictEqual(expected);
  });

  it("calls toObject() on a Mongoose document before mapping", () => {
    const doc = { toObject: () => source, $__: { internal: true } };
    expect(toDto(SampleDto, doc)).toStrictEqual(expected);
  });

  it("returns a plain object, not a class instance", () => {
    const dto = toDto(SampleDto, source);
    expect(Object.getPrototypeOf(dto)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(dto.name)).toBe(Object.prototype);
  });

  it("never copies a key the DTO does not expose", () => {
    const dto = toDto(SampleDto, source) as unknown as Record<string, unknown>;
    expect(dto).not.toHaveProperty("passwordHash");
    expect(dto).not.toHaveProperty("__v");
  });

  it("keeps present optional values and converts set ids and dates", () => {
    const readAt = new Date("2026-02-03T04:05:06.000Z");
    const dto = toDto(SampleDto, {
      ...source,
      ownerId: otherId,
      note: "n",
      readAt,
      count: 3
    });
    expect(dto).toMatchObject({
      ownerId: otherId.toString(),
      note: "n",
      readAt: readAt.toISOString(),
      count: 3
    });
  });

  it("maps arrays element by element", () => {
    expect(toDto(NameDto, [{ en: "a", vi: "b", x: 1 }])).toStrictEqual([
      { en: "a", vi: "b" }
    ]);
  });
});
