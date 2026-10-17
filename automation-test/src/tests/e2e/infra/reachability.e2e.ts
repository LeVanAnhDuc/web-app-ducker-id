import { test, expect } from "@/fixtures";

// Infrastructure smoke: the client answers at all. No test case — not product behaviour.
test.use({ role: "guest" });

test("INFRA-01 web is reachable", { tag: ["@smoke"] }, async ({ page }) => {
  const res = await page.goto("/login");
  expect(res?.status()).toBeLessThan(400);
});
