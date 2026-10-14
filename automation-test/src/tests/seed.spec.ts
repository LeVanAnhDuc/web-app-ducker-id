import { test } from "@/fixtures";

// Seed for the playwright-test agents (planner / generator): an anonymous
// browser on the login page. Point it at the screen the next module starts
// from (a page object's goto()), or switch the role with test.use({ role }).
test.use({ role: "guest" });

test("seed", async ({ page }) => {
  await page.goto("/login");
});
