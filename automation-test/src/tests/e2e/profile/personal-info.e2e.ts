import { test, expect } from "@/fixtures";
import { clientLiteral, copy, copyVi, serverMessage } from "@/data/copy";
import { PROFILE_FIXTURE } from "@/data/test-data";
import { ProfilePage } from "@/pages/settings/profile.page";
import { createAccount } from "@/utils/accounts";
import { isoDateFromToday, toDisplayDate } from "@/utils/dates";
import {
  accountWithProfile,
  countProfileUpdates,
  failProfileUpdate,
  openProfileAs,
  storedProfile
} from "./helpers";

// Profile — view and edit Personal Information on /profile. Test cases:
// test-cases/profile.md (TC-PROFILE-010 … TC-PROFILE-021, TC-PROFILE-047 …
// TC-PROFILE-050). Every test signs a throwaway account into an empty
// (`guest`) context, so the seeded user@test.com profile is never edited.
// Each account starts from PROFILE_FIXTURE ("Linh" / "Tran Thi").

test.use({ role: "guest" });

const t = copy.account.personalInfo;
const v = copy.common.validation;

test.describe("view", () => {
  test(
    "Personal Information shows the stored profile",
    { tag: ["@TC-PROFILE-010", "@smoke"] },
    async ({ newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-view");
      await openProfileAs(profilePage, account);

      await expect(profilePage.text(account.email)).toBeVisible();
      await expect(profilePage.text(PROFILE_FIXTURE.fullName)).toBeVisible();
      await expect(profilePage.firstNameInput()).toHaveValue("Linh");
      await expect(profilePage.lastNameInput()).toHaveValue("Tran Thi");
      await expect(profilePage.phoneInput()).toHaveValue(PROFILE_FIXTURE.phone);
      await expect(profilePage.addressInput()).toHaveValue(
        PROFILE_FIXTURE.address
      );
      await expect(profilePage.dateOfBirthInput()).toHaveValue("15/03/1990");
      await expect(profilePage.genderSelect()).toHaveText(
        t.genderOptions.female
      );
    }
  );
});

test.describe("edit", () => {
  test(
    "Editing every field saves and survives a reload",
    { tag: ["@TC-PROFILE-011", "@smoke"] },
    async ({ page, newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-edit");
      await openProfileAs(profilePage, account);

      await profilePage.firstNameInput().fill("Minh");
      await profilePage.lastNameInput().fill("Nguyen Van");
      await profilePage.phoneInput().fill("0912 345 678");
      await profilePage.addressInput().fill("99 Tran Hung Dao, Hue");
      await profilePage.dateOfBirthInput().fill("20/07/1988");
      await profilePage.selectGender(t.genderOptions.male);

      await profilePage.save();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();

      await page.reload();
      await expect(profilePage.firstNameInput()).toHaveValue("Minh");
      await expect(profilePage.lastNameInput()).toHaveValue("Nguyen Van");
      await expect(profilePage.phoneInput()).toHaveValue("0912 345 678");
      await expect(profilePage.addressInput()).toHaveValue(
        "99 Tran Hung Dao, Hue"
      );
      await expect(profilePage.dateOfBirthInput()).toHaveValue("20/07/1988");
      await expect(profilePage.genderSelect()).toHaveText(t.genderOptions.male);

      const stored = await storedProfile(newApi, account);
      expect(stored.fullName).toBe("Minh Nguyen Van");
      expect(stored.gender).toBe("male");
      expect(String(stored.dateOfBirth)).toMatch(/^1988-07-20/);
    }
  );

  test(
    "Save and Cancel follow the dirty state; Cancel restores",
    { tag: ["@TC-PROFILE-012"] },
    async ({ newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-pristine");
      await openProfileAs(profilePage, account);

      await expect(profilePage.saveButton()).toBeDisabled();
      await expect(profilePage.cancelButton()).toBeDisabled();

      await profilePage.firstNameInput().fill("Changed");
      await expect(profilePage.saveButton()).toBeEnabled();
      await profilePage.cancelButton().click();
      await expect(profilePage.firstNameInput()).toHaveValue("Linh");
      await expect(profilePage.saveButton()).toBeDisabled();
    }
  );

  test(
    "A server failure keeps the edits",
    { tag: ["@TC-PROFILE-021"] },
    async ({ page, newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-500");
      await openProfileAs(profilePage, account);
      await failProfileUpdate(page);
      await profilePage.firstNameInput().fill("Unsaved");
      await profilePage.save();
      await expect(
        profilePage.toast.withText(clientLiteral.serverErrorToast)
      ).toBeVisible();
      await expect(profilePage.firstNameInput()).toHaveValue("Unsaved");
    }
  );

  test(
    "Double-clicking Save sends one update",
    { tag: ["@TC-PROFILE-047"] },
    async ({ page, newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-dblclick");
      await openProfileAs(profilePage, account);
      const updates = countProfileUpdates(page);

      await profilePage.addressInput().fill("7 Hai Ba Trung, Hanoi");
      await profilePage.saveButton().dblclick();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();
      expect(updates.count).toBe(1);
      expect((await storedProfile(newApi, account)).address).toBe(
        "7 Hai Ba Trung, Hanoi"
      );
    }
  );

  test(
    "After saving, Save and Cancel are disabled again",
    { tag: ["@TC-PROFILE-048"] },
    async ({ newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-saved");
      await openProfileAs(profilePage, account);

      await profilePage.addressInput().fill("3 Nguyen Hue, Saigon");
      await expect(profilePage.saveButton()).toBeEnabled();
      await profilePage.save();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();

      await expect(profilePage.saveButton()).toBeDisabled();
      await expect(profilePage.cancelButton()).toBeDisabled();
      await expect(profilePage.addressInput()).toHaveValue(
        "3 Nguyen Hue, Saigon"
      );
    }
  );
});

test.describe("field validation", () => {
  // Phone: EP (allowed chars / letters) + BVA on the 20-char maximum.
  test.describe(
    "Phone accepts its characters up to 20",
    { tag: ["@TC-PROFILE-013"] },
    () => {
      const phoneCases: ReadonlyArray<{ value: string; error: string | null }> =
        [
          { value: "abc-123", error: v.phone.invalid },
          { value: "1".repeat(21), error: v.phone.maxLength },
          { value: "1".repeat(20), error: null },
          { value: "+84 (90) 123-4567", error: null }
        ];
      for (const { value, error } of phoneCases) {
        test(`phone "${value}" is ${error ? "rejected" : "accepted"}`, async ({
          newApi,
          profilePage
        }) => {
          const account = await accountWithProfile(newApi, "pf-phone");
          await openProfileAs(profilePage, account);
          await profilePage.phoneInput().fill(value);
          await profilePage.save();
          if (error) {
            await expect(profilePage.formMessage(error)).toBeVisible();
          } else {
            await expect(
              profilePage.toast.withText(t.toast.success)
            ).toBeVisible();
            expect((await storedProfile(newApi, account)).phone).toBe(value);
          }
        });
      }
    }
  );

  // Address: EP (markup characters) + BVA on the 500-char maximum.
  test.describe(
    "Address refuses markup and more than 500 characters",
    { tag: ["@TC-PROFILE-014"] },
    () => {
      const addressCases: ReadonlyArray<{
        value: string;
        error: string | null;
      }> = [
        { value: "<script>alert(1)</script>", error: v.address.invalid },
        { value: "a".repeat(501), error: v.address.maxLength },
        { value: "a".repeat(500), error: null }
      ];
      for (const { value, error } of addressCases) {
        test(`address of ${value.length} chars ${error ? "is rejected" : "is accepted"}${
          value.startsWith("<") ? " (markup)" : ""
        }`, async ({ newApi, profilePage }) => {
          const account = await accountWithProfile(newApi, "pf-addr");
          await openProfileAs(profilePage, account);
          await profilePage.addressInput().fill(value);
          await profilePage.save();
          if (error) {
            await expect(profilePage.formMessage(error)).toBeVisible();
          } else {
            await expect(
              profilePage.toast.withText(t.toast.success)
            ).toBeVisible();
          }
        });
      }
    }
  );

  test(
    "An empty first name shows a translated message",
    { tag: ["@TC-PROFILE-015"] },
    async ({ newApi, profilePage }) => {
      // common.validation has firstName/lastName keys, so the raw zod
      // message "required" never shows (fixed BUG-PROFILE-04).
      const account = await accountWithProfile(newApi, "pf-name");
      await openProfileAs(profilePage, account);
      await profilePage.firstNameInput().fill("");
      await profilePage.save();
      await expect(profilePage.firstNameInput()).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await expect(
        profilePage.formMessage("required", { exact: true })
      ).toHaveCount(0);
    }
  );

  // First name: BVA on the client-only 50-char maximum (zod; the server
  // checks the joined fullName at 100).
  test.describe(
    "First name takes 50 characters and blocks 51 with a translated message",
    { tag: ["@TC-PROFILE-049"] },
    () => {
      test("50 characters are saved", async ({ newApi, profilePage }) => {
        const account = await accountWithProfile(newApi, "pf-first50");
        await openProfileAs(profilePage, account);
        const fifty = "a".repeat(50);
        await profilePage.firstNameInput().fill(fifty);
        await profilePage.save();
        await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();
        expect((await storedProfile(newApi, account)).fullName).toBe(
          `${fifty} Tran Thi`
        );
      });

      test("51 characters are blocked with a translated message", async ({
        page,
        newApi,
        profilePage
      }) => {
        // Same as TC-PROFILE-015: the raw zod key "maxLength" must not
        // show (fixed BUG-PROFILE-04).
        const account = await accountWithProfile(newApi, "pf-first51");
        await openProfileAs(profilePage, account);
        const updates = countProfileUpdates(page);
        await profilePage.firstNameInput().fill("a".repeat(51));
        await profilePage.save();
        await expect(profilePage.firstNameInput()).toHaveAttribute(
          "aria-invalid",
          "true"
        );
        expect(updates.count).toBe(0);
        await expect(
          profilePage.formMessage("maxLength", { exact: true })
        ).toHaveCount(0);
      });
    }
  );

  test(
    "A first name the server refuses keeps the edits and saves nothing",
    { tag: ["@TC-PROFILE-050"] },
    async ({ newApi, profilePage }) => {
      // zod puts no character rule on firstName; the server's fullName
      // pattern refuses digits with a 400 VALIDATION_ERROR.
      const account = await accountWithProfile(newApi, "pf-digits");
      await openProfileAs(profilePage, account);
      await profilePage.firstNameInput().fill("Linh2");
      await profilePage.save();
      await expect(
        profilePage.toast.withText(serverMessage.common.errors.validationFailed)
      ).toBeVisible();
      await expect(profilePage.firstNameInput()).toHaveValue("Linh2");
      expect((await storedProfile(newApi, account)).fullName).toBe(
        PROFILE_FIXTURE.fullName
      );
    }
  );

  // Date of birth — the typed value is only taken when it is inside the
  // picker's bounds (13 … 120 years ago); outside them the field keeps its
  // stored value, so the form never becomes dirty.
  test(
    "The date of birth is only taken inside 13–120 years",
    { tag: ["@TC-PROFILE-016"] },
    async ({ newApi, profilePage }) => {
      const account = await accountWithProfile(newApi, "pf-dob");
      await openProfileAs(profilePage, account);

      await profilePage
        .dateOfBirthInput()
        .fill(toDisplayDate(isoDateFromToday(-13, 1)));
      await expect(profilePage.saveButton()).toBeDisabled();

      const thirteen = isoDateFromToday(-13);
      await profilePage.dateOfBirthInput().fill(toDisplayDate(thirteen));
      await expect(profilePage.saveButton()).toBeEnabled();
      await profilePage.save();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();
      expect(
        String((await storedProfile(newApi, account)).dateOfBirth)
      ).toMatch(new RegExp(`^${thirteen}`));
    }
  );

  test(
    "A user born 101–120 years ago can still edit the profile",
    { tag: ["@TC-PROFILE-017"] },
    async ({ profilePage }) => {
      // sign-up accepts ages up to 120 and the form always resends
      // dateOfBirth, so the profile rules must take the same range (fixed
      // BUG-PROFILE-01).
      const account = await createAccount({
        tag: "pf-elder",
        fullName: "Elder Tester",
        dateOfBirth: isoDateFromToday(-110)
      });
      await openProfileAs(profilePage, account);
      await profilePage.firstNameInput().fill("Renamed");
      await profilePage.save();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible({
        timeout: 5_000
      });
    }
  );
});

test.describe("error guessing", () => {
  test(
    "Clearing the phone removes it",
    { tag: ["@TC-PROFILE-019"] },
    async ({ newApi, profilePage }) => {
      // An emptied optional field is sent as null and cleared on the
      // server (fixed BUG-PROFILE-02).
      const account = await accountWithProfile(newApi, "pf-clear");
      await openProfileAs(profilePage, account);
      await profilePage.phoneInput().fill("");
      await profilePage.save();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();
      expect((await storedProfile(newApi, account)).phone).toBeNull();
    }
  );

  test(
    "The header shows the new name right after saving",
    { tag: ["@TC-PROFILE-020"] },
    async ({ newApi, profilePage }) => {
      // The idToken is not re-issued after PATCH /users/me, so ProfileCard
      // reads the name from the profile query (fixed BUG-PROFILE-03).
      const account = await accountWithProfile(newApi, "pf-header");
      await openProfileAs(profilePage, account);
      await profilePage.firstNameInput().fill("Hoa");
      await profilePage.save();
      await expect(profilePage.toast.withText(t.toast.success)).toBeVisible();
      await expect(
        profilePage.text("Hoa Tran Thi", { exact: true })
      ).toBeVisible();
    }
  );
});

test.describe("Vietnamese", () => {
  test(
    "Editing in Vietnamese",
    { tag: ["@TC-PROFILE-018"] },
    async ({ page, newApi }) => {
      const tv = copyVi.account.personalInfo;
      const vi = new ProfilePage(page, copyVi);
      const account = await accountWithProfile(newApi, "pf-vi");
      await openProfileAs(vi, account, "/vi");
      await expect(vi.personalInfoHeading()).toBeVisible();
      await expect(vi.firstNameInput()).toHaveValue("Linh");
      await expect(vi.lastNameInput()).toHaveValue("Tran Thi");
      await expect(vi.phoneInput()).toHaveValue(PROFILE_FIXTURE.phone);
      await expect(vi.addressInput()).toHaveValue(PROFILE_FIXTURE.address);
      await expect(vi.genderSelect()).toHaveText(tv.genderOptions.female);
      await expect(vi.dateOfBirthInput()).toHaveValue("15/03/1990");

      await vi.addressInput().fill("1 Le Loi, Da Nang");
      await vi.save();
      await expect(vi.toast.withText(tv.toast.success)).toBeVisible();
    }
  );
});
