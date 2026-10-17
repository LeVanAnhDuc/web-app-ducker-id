jest.mock("@/models/user", () => ({
  __esModule: true,
  default: { aggregate: jest.fn(), findByIdAndUpdate: jest.fn() }
}));

// types
import type { PaginationOptions } from "@/types/common";
// models
import UserModel from "@/models/user";
import { MongoUserRepository } from "../impl/mongo-user.repository";

const mockedAggregate = UserModel.aggregate as unknown as jest.Mock;
const mockedFindByIdAndUpdate =
  UserModel.findByIdAndUpdate as unknown as jest.Mock;

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

describe("MongoUserRepository.updateById", () => {
  const chain = { select: jest.fn(), lean: jest.fn(), exec: jest.fn() };

  beforeEach(() => {
    chain.select.mockReturnValue(chain);
    chain.lean.mockReturnValue(chain);
    chain.exec.mockResolvedValue({ _id: "u1" });
    mockedFindByIdAndUpdate.mockReturnValue(chain);
  });

  it("sets the given fields", async () => {
    await new MongoUserRepository().updateById("u1", {
      fullName: "Hoa Tran",
      phone: "0901234567"
    });

    expect(mockedFindByIdAndUpdate).toHaveBeenCalledWith(
      "u1",
      { $set: { fullName: "Hoa Tran", phone: "0901234567" } },
      { new: true }
    );
  });

  it("unsets a field sent as null so it can be cleared", async () => {
    await new MongoUserRepository().updateById("u1", {
      fullName: "Hoa Tran",
      phone: null,
      address: null
    });

    expect(mockedFindByIdAndUpdate).toHaveBeenCalledWith(
      "u1",
      { $set: { fullName: "Hoa Tran" }, $unset: { phone: "", address: "" } },
      { new: true }
    );
  });
});
