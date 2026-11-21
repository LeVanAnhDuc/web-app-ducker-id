// modules
import {
  EntitlementMatrixQueryDto,
  UpdateEntitlementsBodyDto
} from "@/modules/entitlement/dtos/requests";
// validators
import { validateDto } from "@/validators/validate-dto";
import {
  entitlementMatrixQuerySchema,
  updateEntitlementsBodySchema
} from "@/validators/schemas/entitlement";
// others
import { expectParity } from "@test/helpers/validation-parity";

const A = "64b2f0c2f1a2b3c4d5e6f7a1";
const B = "64b2f0c2f1a2b3c4d5e6f7a2";

const ids = (count: number): string[] =>
  Array.from({ length: count }, (_, i) =>
    (i + 1).toString(16).padStart(24, "0")
  );

const CHANGE = { userId: A, appId: B, granted: true };

const changes = (count: number) =>
  ids(count).map((appId) => ({ ...CHANGE, appId }));

const withChange = (overrides: Record<string, unknown>) => ({
  changes: [{ ...CHANGE, ...overrides }]
});

describe("entitlement request DTOs match the Joi schemas", () => {
  it("EntitlementMatrixQueryDto ≡ entitlementMatrixQuerySchema", async () => {
    await expectParity(
      entitlementMatrixQuerySchema,
      EntitlementMatrixQueryDto,
      {
        // `?userIds=a,b` arrives as one string and is split into ids.
        commaList: { userIds: `${A},${B}` },
        commaListPadded: { userIds: ` ${A} , ${B} ` },
        commaListBlankEntries: { userIds: `${A},,${B},` },
        // `?userIds=a&userIds=b` arrives as an array and is not split.
        repeatedParam: { userIds: [A, B] },
        atMax: { userIds: ids(50).join(",") },
        unknownStripped: { userIds: A, appIds: B },

        missing: {},
        empty: { userIds: "" },
        onlyCommas: { userIds: "," },
        emptyArray: { userIds: [] },
        nestedObject: { userIds: { a: A } },
        tooMany: { userIds: ids(51).join(",") },
        badId: { userIds: `${A},abc` },
        badIdInArray: { userIds: [A, ` ${B} `] },
        duplicate: { userIds: `${A},${B},${A}` }
      }
    );
  });

  it("UpdateEntitlementsBodyDto ≡ updateEntitlementsBodySchema", async () => {
    await expectParity(
      updateEntitlementsBodySchema,
      UpdateEntitlementsBodyDto,
      {
        one: { changes: changes(1) },
        atMax: { changes: changes(200) },
        revoke: withChange({ granted: false }),
        unknownStripped: {
          changes: [{ ...CHANGE, note: "x" }],
          reason: "audit"
        },

        emptyBody: {},
        listNull: { changes: null },
        listString: { changes: "x" },
        listObject: { changes: CHANGE },
        emptyList: { changes: [] },
        tooMany: { changes: changes(201) },
        // The same pair twice is reported at the repeat, whatever `granted` is.
        samePairTwice: {
          changes: [CHANGE, { ...CHANGE, granted: false }]
        },
        samePairThirdItem: {
          changes: [CHANGE, { ...CHANGE, userId: B }, CHANGE]
        },

        grantedString: withChange({ granted: "true" }),
        grantedNumber: withChange({ granted: 1 }),
        grantedNull: withChange({ granted: null }),
        grantedMissing: { changes: [{ userId: A, appId: B }] },
        badUserId: withChange({ userId: "x" }),
        badAppId: withChange({ appId: 5 }),
        emptyIds: withChange({ userId: "", appId: "" }),
        missingAll: { changes: [{}] },
        secondItemBad: {
          changes: [CHANGE, { ...CHANGE, userId: B, appId: "x" }]
        },
        nonObjectItems: { changes: [5, "x"] }
      }
    );
  });

  // Not a parity row: Joi's unique comparator reads `a.userId` and throws on
  // a null item, so the old route answered 500. The DTO answers 400.
  it("UpdateEntitlementsBodyDto refuses a null change instead of throwing", async () => {
    const { failures } = await validateDto(UpdateEntitlementsBodyDto, {
      changes: [CHANGE, null]
    });

    expect(failures).toEqual([
      {
        field: "changes.1",
        reason: "nestedValidation",
        key: "entitlement:validation.changes.required"
      }
    ]);
  });
});
