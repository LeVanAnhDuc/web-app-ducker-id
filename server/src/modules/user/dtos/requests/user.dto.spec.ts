// modules
import {
  AdminUserIdParamsDto,
  AdminUsersQueryDto,
  PublicProfileParamsDto,
  UpdateProfileBodyDto
} from "@/modules/user/dtos/requests";
// validators
// others
import { expectDto } from "@test/helpers/dto-cases";

// Fixed dates rather than "N years ago": the snapshots must not move with the
// clock. The age-boundary cases sit years away from either bound.
const ADULT = "1995-05-15";

const idCases = {
  valid: { id: "507f1f77bcf86cd799439011" },
  validUpperCase: { id: "507F1F77BCF86CD799439011" },
  missing: {},
  null: { id: null },
  empty: { id: "" },
  wrongType: { id: 123 },
  tooShort: { id: "507f1f77bcf86cd79943901" },
  notHex: { id: "507f1f77bcf86cd79943901z" },
  unknownStripped: { id: "507f1f77bcf86cd799439011", extra: "x" }
};

describe("user request DTOs match the Joi schemas", () => {
  it("UpdateProfileBodyDto ≡ updateProfileSchema", async () => {
    await expectDto(UpdateProfileBodyDto, {
      emptyBody: {},
      unknownStripped: { role: "admin" },
      allFields: {
        fullName: "Nguyễn Văn A",
        phone: "+84 (90) 123-4567",
        address: "12/3 Lê Lợi, Q.1",
        dateOfBirth: ADULT,
        gender: "female"
      },
      allNullableNull: {
        phone: null,
        address: null,
        dateOfBirth: null,
        gender: null
      },

      fullNamePadded: { fullName: "  Hoa Tran  " },
      fullNameWhitespaceOnly: { fullName: "   " },
      fullNameEmpty: { fullName: "" },
      fullNameNull: { fullName: null },
      fullNameWrongType: { fullName: 123 },
      fullNameTooShort: { fullName: "A" },
      fullNamePaddedTooShort: { fullName: "  A  " },
      fullNameTooLong: { fullName: "a".repeat(101) },
      fullNamePatternBreak: { fullName: "John3" },

      phoneEmpty: { phone: "" },
      phoneWrongType: { phone: 123 },
      phoneTooLong: { phone: "1".repeat(21) },
      phonePatternBreak: { phone: "090-abc" },

      addressEmpty: { address: "" },
      addressWrongType: { address: 123 },
      addressTooLong: { address: "a".repeat(501) },
      addressPatternBreak: { address: "<script>" },

      dateOfBirthIsoDateTime: { dateOfBirth: "1995-05-15T10:30:00+07:00" },
      dateOfBirthYearOnly: { dateOfBirth: "1995" },
      dateOfBirthEmpty: { dateOfBirth: "" },
      dateOfBirthWrongType: { dateOfBirth: 800000000000 },
      dateOfBirthNotIso: { dateOfBirth: "15/05/1995" },
      dateOfBirthPadded: { dateOfBirth: " 1995-05-15 " },
      dateOfBirthTooYoung: { dateOfBirth: "2025-01-01" },
      dateOfBirthTooOld: { dateOfBirth: "1900-01-01" },
      dateOfBirthOldButInRange: { dateOfBirth: "1950-01-01" },

      genderEmpty: { gender: "" },
      genderWrongType: { gender: 1 },
      genderUnknown: { gender: "unknown" },
      genderArray: { gender: ["male"] }
    });
  });

  it("PublicProfileParamsDto ≡ getPublicProfileSchema", async () => {
    await expectDto(PublicProfileParamsDto, idCases);
  });

  it("AdminUserIdParamsDto ≡ adminUserIdParamsSchema", async () => {
    await expectDto(AdminUserIdParamsDto, idCases);
  });

  it("AdminUsersQueryDto ≡ adminUsersQuerySchema", async () => {
    await expectDto(AdminUsersQueryDto, {
      empty: {},
      allFields: {
        page: "2",
        limit: "20",
        search: "  hoa  ",
        role: "admin",
        status: "locked",
        sortBy: "lastLoginAt",
        sortOrder: "asc"
      },
      unknownStripped: { foo: "bar" },

      pageZero: { page: "0" },
      pageNotNumber: { page: "abc" },
      pageFraction: { page: "1.5" },
      pageEmpty: { page: "" },
      limitTooLarge: { limit: "101" },
      limitZero: { limit: "0" },

      searchEmpty: { search: "" },
      searchWhitespaceOnly: { search: "   " },
      searchWrongType: { search: ["a"] },
      searchAtMaxPadded: { search: ` ${"a".repeat(200)} ` },
      searchTooLong: { search: "a".repeat(201) },

      roleEmpty: { role: "" },
      roleUnknown: { role: "root" },
      roleArray: { role: ["admin"] },
      statusEmpty: { status: "" },
      statusUnknown: { status: "deleted" },
      sortByUnknown: { sortBy: "email" },
      sortByEmpty: { sortBy: "" },
      sortOrderUnknown: { sortOrder: "up" },
      sortOrderArray: { sortOrder: ["asc"] }
    });
  });
});
