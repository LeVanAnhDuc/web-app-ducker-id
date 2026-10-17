import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { getUrls, worktreeClientUrl } from "./urls";

test("worktreeClientUrl reads the client port of the current feature folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wt-"));
  const feature = path.join(root, "my-feature", "automation-test");
  fs.mkdirSync(feature, { recursive: true });
  fs.writeFileSync(
    path.join(root, ".worktree-state.json"),
    JSON.stringify({ "automation-test": { clientPort: 3100 } })
  );
  expect(worktreeClientUrl(feature)).toBe("http://localhost:3100");
  expect(worktreeClientUrl(path.join(root, "my-feature"))).toBeUndefined();
  fs.rmSync(root, { recursive: true, force: true });
});

test("getUrls resolves every URL without a trailing slash", () => {
  const urls = getUrls();
  for (const value of Object.values(urls)) expect(value).not.toMatch(/\/$/);
  expect(urls.apiPrefix).toMatch(/^\//);
});
