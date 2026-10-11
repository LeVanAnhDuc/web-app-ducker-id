import { test, expect } from "@fixtures";
import type { Locator, Page } from "@playwright/test";
import { createAccount, type Account } from "@helpers/accounts";
import { loginInBrowser } from "@helpers/password";
import {
  createAccountWithDob,
  getProfile,
  isoDateFromToday,
  patchProfile,
  toDisplayDate
} from "@helpers/profile";

// Profile — view and edit Personal Information on /profile. Test cases:
// test-cases/profile.md (TC-PROFILE-010 … TC-PROFILE-022). Every test signs a
// throwaway account into an empty (`guest`) context, so the seeded
// user@test.com profile is never edited. Copy is verbatim from
// client/src/locales/{en,vi}/{account,common}.json.

test.use({ role: "guest" });

const EN = {
  title: "Personal Information",
  firstName: "First Name",
  lastName: "Last Name",
  phone: "Phone",
  address: "Address",
  dobPlaceholder: "Select date of birth",
  gender: "Gender",
  save: "Save Changes",
  cancel: "Cancel",
  toastSuccess: "Profile updated successfully",
  phoneInvalid: "Invalid phone number format",
  phoneTooLong: "Phone number is too long",
  addressInvalid: "Address contains invalid characters",
  addressTooLong: "Address must not exceed 500 characters",
  dobInvalid: "Date must be in the past and within 100 years",
  serverError: "Server error. Please try again later."
} as const;

const VI = {
  title: "Thông tin cá nhân",
  firstName: "Họ",
  lastName: "Tên",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  gender: "Giới tính",
  save: "Lưu thay đổi",
  toastSuccess: "Cập nhật hồ sơ thành công",
  female: "Nữ"
} as const;

const SEED = {
  fullName: "Linh Tran Thi",
  phone: "+84 90 123 4567",
  address: "12 Ly Thai To, Hoan Kiem",
  dateOfBirth: "1990-03-15",
  gender: "female"
} as const;

const card = (page: Page): Locator =>
  page.locator('[aria-labelledby="personal-info-title"]');
const field = (page: Page, label: string) =>
  card(page).getByLabel(label, { exact: true });
const dobInput = (page: Page, placeholder: string = EN.dobPlaceholder) =>
  card(page).getByPlaceholder(placeholder);
const saveButton = (page: Page, name: string = EN.save) =>
  card(page).getByRole("button", { name });

async function openProfile(
  page: Page,
  account: Account,
  prefix = ""
): Promise<void> {
  await loginInBrowser(page, account.email, account.password);
  await page.goto(`${prefix}/profile`);
  await expect(card(page)).toBeVisible();
}

async function seededAccount(tag: string): Promise<Account> {
  const account = await createAccount({ tag, fullName: SEED.fullName });
  await patchProfile(account, { ...SEED });
  return account;
}

test.describe("Profile — view", () => {
  test(
    "shows the stored name, email, phone, address, date of birth and gender",
    { tag: ["@TC-PROFILE-010", "@smoke"] },
    async ({ page }) => {
      const account = await seededAccount("pf-view");
      await openProfile(page, account);

      await expect(page.getByText(account.email).first()).toBeVisible();
      await expect(page.getByText(SEED.fullName).first()).toBeVisible();
      await expect(field(page, EN.firstName)).toHaveValue("Linh");
      await expect(field(page, EN.lastName)).toHaveValue("Tran Thi");
      await expect(field(page, EN.phone)).toHaveValue(SEED.phone);
      await expect(field(page, EN.address)).toHaveValue(SEED.address);
      await expect(dobInput(page)).toHaveValue("15/03/1990");
      await expect(
        card(page).getByRole("combobox", { name: EN.gender })
      ).toHaveText("Female");
    }
  );
});

test.describe("Profile — edit", () => {
  test(
    "editing every field saves, toasts and survives a reload",
    { tag: ["@TC-PROFILE-011", "@smoke"] },
    async ({ page }) => {
      const account = await seededAccount("pf-edit");
      await openProfile(page, account);

      await field(page, EN.firstName).fill("Minh");
      await field(page, EN.lastName).fill("Nguyen Van");
      await field(page, EN.phone).fill("0912 345 678");
      await field(page, EN.address).fill("99 Tran Hung Dao, Hue");
      await dobInput(page).fill("20/07/1988");
      await card(page).getByRole("combobox", { name: EN.gender }).click();
      await page.getByRole("option", { name: "Male", exact: true }).click();

      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();

      await page.reload();
      await expect(field(page, EN.firstName)).toHaveValue("Minh");
      await expect(field(page, EN.lastName)).toHaveValue("Nguyen Van");
      await expect(field(page, EN.phone)).toHaveValue("0912 345 678");
      await expect(field(page, EN.address)).toHaveValue(
        "99 Tran Hung Dao, Hue"
      );
      await expect(dobInput(page)).toHaveValue("20/07/1988");
      await expect(
        card(page).getByRole("combobox", { name: EN.gender })
      ).toHaveText("Male");

      const stored = await getProfile(account);
      expect(stored.fullName).toBe("Minh Nguyen Van");
      expect(stored.gender).toBe("male");
      expect(String(stored.dateOfBirth)).toMatch(/^1988-07-20/);
    }
  );

  test(
    "Save and Cancel stay disabled until something changes; Cancel restores the stored values",
    { tag: ["@TC-PROFILE-012"] },
    async ({ page }) => {
      const account = await seededAccount("pf-pristine");
      await openProfile(page, account);
      const cancel = card(page).getByRole("button", { name: EN.cancel });

      await expect(saveButton(page)).toBeDisabled();
      await expect(cancel).toBeDisabled();

      await field(page, EN.firstName).fill("Changed");
      await expect(saveButton(page)).toBeEnabled();
      await cancel.click();
      await expect(field(page, EN.firstName)).toHaveValue("Linh");
      await expect(saveButton(page)).toBeDisabled();
    }
  );

  test(
    "a server failure keeps the edits and shows the server-error toast",
    { tag: ["@TC-PROFILE-021"] },
    async ({ page }) => {
      const account = await seededAccount("pf-500");
      await openProfile(page, account);
      await page.route("**/api/v1/users/me", (route) =>
        route.request().method() === "PATCH"
          ? route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({
                code: "INTERNAL_SERVER_ERROR",
                message: "x"
              })
            })
          : route.continue()
      );
      await field(page, EN.firstName).fill("Unsaved");
      await saveButton(page).click();
      await expect(page.getByText(EN.serverError)).toBeVisible();
      await expect(field(page, EN.firstName)).toHaveValue("Unsaved");
    }
  );
});

test.describe("Profile — field validation", () => {
  // Phone: EP (allowed chars / letters) + BVA on the 20-char maximum.
  const phoneCases: ReadonlyArray<{ value: string; error: string | null }> = [
    { value: "abc-123", error: EN.phoneInvalid },
    { value: "1".repeat(21), error: EN.phoneTooLong },
    { value: "1".repeat(20), error: null },
    { value: "+84 (90) 123-4567", error: null }
  ];
  for (const { value, error } of phoneCases) {
    test(
      `phone "${value}" is ${error ? "rejected" : "accepted"}`,
      { tag: ["@TC-PROFILE-013"] },
      async ({ page }) => {
        const account = await seededAccount("pf-phone");
        await openProfile(page, account);
        await field(page, EN.phone).fill(value);
        await saveButton(page).click();
        if (error) {
          await expect(card(page).getByText(error)).toBeVisible();
        } else {
          await expect(page.getByText(EN.toastSuccess)).toBeVisible();
          expect((await getProfile(account)).phone).toBe(value);
        }
      }
    );
  }

  // Address: EP (markup characters) + BVA on the 500-char maximum.
  const addressCases: ReadonlyArray<{ value: string; error: string | null }> = [
    { value: "<script>alert(1)</script>", error: EN.addressInvalid },
    { value: "a".repeat(501), error: EN.addressTooLong },
    { value: "a".repeat(500), error: null }
  ];
  for (const { value, error } of addressCases) {
    test(
      `address of ${value.length} chars ${error ? "is rejected" : "is accepted"}${
        value.startsWith("<") ? " (markup)" : ""
      }`,
      { tag: ["@TC-PROFILE-014"] },
      async ({ page }) => {
        const account = await seededAccount("pf-addr");
        await openProfile(page, account);
        await field(page, EN.address).fill(value);
        await saveButton(page).click();
        if (error) {
          await expect(card(page).getByText(error)).toBeVisible();
        } else {
          await expect(page.getByText(EN.toastSuccess)).toBeVisible();
        }
      }
    );
  }

  test(
    "an empty first name is blocked with a translated message",
    { tag: ["@TC-PROFILE-015"] },
    async ({ page }) => {
      // BUG: BUG-026 — common.validation has no firstName/lastName keys, so
      // FormFieldMessage falls back to the raw zod message "required".
      test.fail();
      const account = await seededAccount("pf-name");
      await openProfile(page, account);
      await field(page, EN.firstName).fill("");
      await saveButton(page).click();
      await expect(field(page, EN.firstName)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await expect(
        card(page).getByText("required", { exact: true })
      ).toHaveCount(0);
    }
  );

  // Date of birth — the typed value is only taken when it is inside the
  // picker's bounds (13 … 120 years ago); outside them the field keeps its
  // stored value, so the form never becomes dirty.
  test(
    "a typed date of birth under 13 years is ignored; exactly 13 years is taken",
    { tag: ["@TC-PROFILE-016"] },
    async ({ page }) => {
      const account = await seededAccount("pf-dob");
      await openProfile(page, account);

      await dobInput(page).fill(toDisplayDate(isoDateFromToday(-13, 1)));
      await expect(saveButton(page)).toBeDisabled();

      const thirteen = isoDateFromToday(-13);
      await dobInput(page).fill(toDisplayDate(thirteen));
      await expect(saveButton(page)).toBeEnabled();
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      expect(String((await getProfile(account)).dateOfBirth)).toMatch(
        new RegExp(`^${thirteen}`)
      );
    }
  );

  test(
    "an account born 101–120 years ago can still save a name change",
    { tag: ["@TC-PROFILE-017"] },
    async ({ page }) => {
      // BUG: BUG-011 — sign-up accepts ages up to 120 and the picker offers them, but the
      // profile zod/Joi rules cap the date at 100 years and the form always
      // resends dateOfBirth — such a user can never save any profile edit.
      test.fail();
      const account = await createAccountWithDob(
        isoDateFromToday(-110),
        "pf-elder"
      );
      await openProfile(page, account);
      await field(page, EN.firstName).fill("Renamed");
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible({
        timeout: 5_000
      });
    }
  );
});

test.describe("Profile — error guessing", () => {
  test(
    "clearing the phone number removes it from the profile",
    { tag: ["@TC-PROFILE-019"] },
    async ({ page }) => {
      // BUG: BUG-012 — PersonalInfoForm drops empty optional fields from the PATCH body
      // and the success refetch puts the old phone back — an optional field
      // can never be cleared, yet the user sees "Profile updated".
      test.fail();
      const account = await seededAccount("pf-clear");
      await openProfile(page, account);
      await field(page, EN.phone).fill("");
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      expect((await getProfile(account)).phone).toBeNull();
    }
  );

  test(
    "the profile header shows the new name right after saving",
    { tag: ["@TC-PROFILE-020"] },
    async ({ page }) => {
      // BUG: BUG-025 — ProfileCard reads the name from the idToken (useUserInfo), which
      // is not re-issued after PATCH /users/me — the header keeps the old
      // name until the next token refresh or reload.
      test.fail();
      const account = await seededAccount("pf-header");
      await openProfile(page, account);
      await field(page, EN.firstName).fill("Hoa");
      await saveButton(page).click();
      await expect(page.getByText(EN.toastSuccess)).toBeVisible();
      await expect(
        page.getByText("Hoa Tran Thi", { exact: true }).first()
      ).toBeVisible();
    }
  );
});

test.describe("Profile — Vietnamese", () => {
  test(
    "/vi/profile shows Vietnamese labels and saves with the Vietnamese toast",
    { tag: ["@TC-PROFILE-018"] },
    async ({ page }) => {
      const account = await seededAccount("pf-vi");
      await openProfile(page, account, "/vi");
      await expect(page.getByRole("heading", { name: VI.title })).toBeVisible();
      await expect(field(page, VI.firstName)).toHaveValue("Linh");
      await expect(field(page, VI.lastName)).toHaveValue("Tran Thi");
      await expect(field(page, VI.phone)).toHaveValue(SEED.phone);
      await expect(field(page, VI.address)).toHaveValue(SEED.address);
      await expect(
        card(page).getByRole("combobox", { name: VI.gender })
      ).toHaveText(VI.female);
      await expect(dobInput(page, "Chọn ngày sinh")).toHaveValue("15/03/1990");

      await field(page, VI.address).fill("1 Le Loi, Da Nang");
      await saveButton(page, VI.save).click();
      await expect(page.getByText(VI.toastSuccess)).toBeVisible();
    }
  );
});
