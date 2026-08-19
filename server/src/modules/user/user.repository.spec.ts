jest.mock("@/models/user", () => ({
  __esModule: true,
  default: { aggregate: jest.fn() }
}));

// types
import type { PaginationOptions } from "@/types/common";
// models
import UserModel from "@/models/user";
import { MongoUserRepository } from "./user.repository";

const mockedAggregate = UserModel.aggregate as unknown as jest.Mock;

const options: PaginationOptions = {
  skip: 0,
  limit: 20,
  sort: { createdAt: -1 }
};

describe("MongoUserRepository.findAdminUsers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns data + total from the $facet result", async () => {
    const row = { _id: "u1", fullName: "A", email: "a@e.vn", role: "user" };
    mockedAggregate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([{ data: [row], total: [{ count: 1 }] }])
    });

    const repo = new MongoUserRepository();
    const result = await repo.findAdminUsers({}, options);

    expect(result).toEqual({ data: [row], total: 1 });
  });

  it("returns total 0 when facet count bucket is empty", async () => {
    mockedAggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ data: [], total: [] }])
    });

    const repo = new MongoUserRepository();
    const result = await repo.findAdminUsers({}, options);

    expect(result).toEqual({ data: [], total: 0 });
  });

  it("adds a $match stage for search, role and isActive when filtered", async () => {
    mockedAggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ data: [], total: [] }])
    });

    const repo = new MongoUserRepository();
    await repo.findAdminUsers(
      { search: "ali", role: "admin", isActive: false },
      options
    );

    const pipeline = mockedAggregate.mock.calls[0][0] as Record<
      string,
      unknown
    >[];
    const matchStages = pipeline.filter((s) => "$match" in s);
    const filterMatch = matchStages[0]["$match"] as Record<string, unknown>;
    expect(filterMatch["auth.roles"]).toBe("admin");
    expect(filterMatch["auth.isActive"]).toBe(false);
    expect(filterMatch.$or).toBeDefined();
  });
});
