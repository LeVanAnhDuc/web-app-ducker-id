import { test, expect } from "@/fixtures";
import { copyVi } from "@/data/copy";
import { HomePage } from "@/pages/dashboard/home.page";

// Home is a private page: a signed-out visitor never sees it.
// Test cases: test-cases/home.md. Role: guest.

test.use({ role: "guest" });

test(
  "A guest is sent to the login screen",
  { tag: ["@TC-HOME-018", "@smoke"] },
  async ({ page }) => {
    await new HomePage(page, copyVi, "/vi").goto();
    await expect(page).toHaveURL(/\/login/);
  }
);
