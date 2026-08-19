// common
import { BadRequestError } from "@/common/exceptions";
// others
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import { WrongCurrentPasswordGuard } from "./wrong-current-password.guard";

jest.mock("@/utils/crypto/bcrypt");

const mockedIsValid = isValidHashedValue as jest.MockedFunction<
  typeof isValidHashedValue
>;

describe("WrongCurrentPasswordGuard", () => {
  const guard = new WrongCurrentPasswordGuard();

  afterEach(() => jest.clearAllMocks());

  it("throws BadRequestError when current password does not match", () => {
    mockedIsValid.mockReturnValue(false);
    expect(() => guard.assert("wrong", "hash")).toThrow(BadRequestError);
  });

  it("passes when current password matches", () => {
    mockedIsValid.mockReturnValue(true);
    expect(() => guard.assert("right", "hash")).not.toThrow();
  });
});
