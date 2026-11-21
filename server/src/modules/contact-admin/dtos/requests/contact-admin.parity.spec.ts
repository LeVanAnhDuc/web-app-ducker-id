// modules
import {
  AdminContactsQueryDto,
  ContactIdParamsDto,
  MyContactsQueryDto,
  SubmitContactBodyDto,
  UpdateContactStatusBodyDto
} from "@/modules/contact-admin/dtos/requests";
// validators
import {
  adminListContactsQuerySchema,
  contactIdParamSchema,
  myContactsQuerySchema,
  submitContactSchema,
  updateContactStatusSchema
} from "@/validators/schemas/contact-admin";
// others
import { expectParity } from "@test/helpers/validation-parity";

const VALID_SUBMIT = {
  email: "user@example.com",
  subject: "Cannot sign in",
  message: "I keep getting an error when signing in."
};

const submit = (overrides: Record<string, unknown>) => ({
  ...VALID_SUBMIT,
  ...overrides
});

const submitWithout = (field: keyof typeof VALID_SUBMIT) => {
  const body: Record<string, unknown> = { ...VALID_SUBMIT };
  delete body[field];
  return body;
};

// Status, search, sort and paging are declared identically on both list
// queries, so both run the same rows.
const sharedQueryCases = {
  empty: {},
  unknownStripped: { foo: "bar" },
  pageZero: { page: "0" },
  pageNotNumber: { page: "abc" },
  pageConverted: { page: "3", limit: "50" },
  limitTooLarge: { limit: "101" },

  statusValid: { status: "resolved" },
  // TC-ADMINCONTACT-023: a blank, null or repeated status is a 400.
  statusEmpty: { status: "" },
  statusNull: { status: null },
  statusArray: { status: ["resolved"] },
  statusUnknown: { status: "deleted" },

  searchPadded: { search: "  login  " },
  searchEmpty: { search: "" },
  searchWhitespaceOnly: { search: "   " },
  searchWrongType: { search: ["a"] },
  searchAtMaxPadded: { search: ` ${"a".repeat(200)} ` },
  searchTooLong: { search: "a".repeat(201) },

  sortByValid: { sortBy: "createdAt", sortOrder: "desc" },
  sortByUnknown: { sortBy: "email" },
  sortByEmpty: { sortBy: "" },
  sortOrderUnknown: { sortOrder: "up" }
};

describe("contact-admin request DTOs match the Joi schemas", () => {
  it("SubmitContactBodyDto ≡ submitContactSchema", async () => {
    await expectParity(submitContactSchema, SubmitContactBodyDto, {
      valid: VALID_SUBMIT,
      unknownStripped: submit({ priority: "high" }),
      emptyBody: {},

      emailMissing: submitWithout("email"),
      emailEmpty: submit({ email: "" }),
      emailWhitespaceOnly: submit({ email: "   " }),
      emailPaddedUpperCase: submit({ email: "  User@Example.COM  " }),
      emailNull: submit({ email: null }),
      emailWrongType: submit({ email: 123 }),
      emailInvalid: submit({ email: "user" }),
      emailUnknownTld: submit({ email: "user@test.local" }),

      subjectMissing: submitWithout("subject"),
      subjectNull: submit({ subject: null }),
      subjectEmpty: submit({ subject: "" }),
      subjectWrongType: submit({ subject: 12345 }),
      subjectTooShort: submit({ subject: "Hey" }),
      subjectTooLong: submit({ subject: "a".repeat(201) }),
      subjectWhitespaceKept: submit({ subject: "      " }),

      messageMissing: submitWithout("message"),
      messageNull: submit({ message: null }),
      messageEmpty: submit({ message: "" }),
      messageWrongType: submit({ message: ["x"] }),
      messageTooShort: submit({ message: "Too short" }),
      messageTooLong: submit({ message: "a".repeat(5001) })
    });
  });

  it("ContactIdParamsDto ≡ contactIdParamSchema", async () => {
    await expectParity(contactIdParamSchema, ContactIdParamsDto, {
      valid: { id: "507f1f77bcf86cd799439011" },
      missing: {},
      null: { id: null },
      empty: { id: "" },
      wrongType: { id: 123 },
      notHex: { id: "507f1f77bcf86cd79943901z" },
      unknownStripped: { id: "507f1f77bcf86cd799439011", extra: "x" }
    });
  });

  it("UpdateContactStatusBodyDto ≡ updateContactStatusSchema", async () => {
    await expectParity(updateContactStatusSchema, UpdateContactStatusBodyDto, {
      valid: { status: "resolved" },
      unknownStripped: { status: "new", priority: "high" },
      missing: {},
      null: { status: null },
      empty: { status: "" },
      wrongType: { status: 1 },
      array: { status: ["resolved"] },
      unknown: { status: "deleted" }
    });
  });

  it("AdminContactsQueryDto ≡ adminListContactsQuerySchema", async () => {
    await expectParity(adminListContactsQuerySchema, AdminContactsQueryDto, {
      ...sharedQueryCases,
      allFields: {
        page: "1",
        limit: "10",
        status: "new",
        priority: "high",
        email: "  user@example.com ",
        search: "login",
        fromDate: "2026-01-01",
        toDate: "2026-02-01T10:00:00+07:00",
        sortBy: "createdAt",
        sortOrder: "asc"
      },

      priorityEmpty: { priority: "" },
      priorityUnknown: { priority: "urgent" },
      priorityArray: { priority: ["high"] },

      emailPadded: { email: "  someone  " },
      emailEmpty: { email: "" },
      emailWhitespaceOnly: { email: "   " },
      emailWrongType: { email: ["a@b.com"] },

      fromDateIso: { fromDate: "2026-01-01" },
      fromDateEmpty: { fromDate: "" },
      fromDateNotIso: { fromDate: "01/02/2026" },
      fromDateWrongType: { fromDate: ["2026-01-01"] },
      toDateEmpty: { toDate: "" },
      toDateNotIso: { toDate: "yesterday" },

      rangeSameDay: { fromDate: "2026-01-01", toDate: "2026-01-01" },
      rangeInverted: { fromDate: "2026-02-01", toDate: "2026-01-01" },
      rangeInvertedByOffset: {
        fromDate: "2026-01-01T00:00:00Z",
        toDate: "2026-01-01T05:00:00+07:00"
      },
      rangeFromInvalid: { fromDate: "bad", toDate: "2026-01-01" },
      rangeToInvalid: { fromDate: "2026-02-01", toDate: "bad" },
      // Joi ran the object-level range rule only once every key passed.
      rangeInvertedWithBadPage: {
        page: "0",
        fromDate: "2026-02-01",
        toDate: "2026-01-01"
      },
      rangeFromNotIsoButParsable: {
        fromDate: "01/02/2026",
        toDate: "2025-01-01"
      }
    });
  });

  it("MyContactsQueryDto ≡ myContactsQuerySchema", async () => {
    await expectParity(myContactsQuerySchema, MyContactsQueryDto, {
      ...sharedQueryCases,
      allFields: {
        page: "2",
        limit: "5",
        status: "processing",
        search: "app",
        sortBy: "createdAt",
        sortOrder: "desc"
      }
    });
  });
});
