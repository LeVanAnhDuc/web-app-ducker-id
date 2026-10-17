import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { mainCheckoutRoot, pick, resolveEnv, sideEnv } from "./env";

const tmp = (prefix: string) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

test("pick takes the first non-blank source", () => {
  expect(pick("K", [{}, { K: "  " }, { K: "b" }, { K: "c" }])).toBe("b");
  expect(pick("K", [{ K: "a" }, { K: "b" }])).toBe("a");
  expect(pick("K", [{}, {}])).toBeUndefined();
});

test("resolveEnv accepts only dev", () => {
  expect(resolveEnv(undefined)).toBe("dev");
  expect(resolveEnv(" DEV ")).toBe("dev");
  expect(() => resolveEnv("prd")).toThrow(/Unknown ENV/);
});

test("sideEnv merges key by key: .env.local over .env over .env.example", () => {
  const dir = tmp("side-env-");
  fs.writeFileSync(
    path.join(dir, ".env.example"),
    "A=example\nB=example\nC=example\n"
  );
  expect(sideEnv(dir, [".env", ".env.local"])).toEqual({
    A: "example",
    B: "example",
    C: "example"
  });

  fs.writeFileSync(path.join(dir, ".env"), "A=env\nB=env\n");
  fs.writeFileSync(path.join(dir, ".env.local"), "A = local\nB=\n");
  // a blank value does not hide a weaker layer; .env.example still fills C
  expect(sideEnv(dir, [".env", ".env.local"])).toEqual({
    A: "local",
    B: "env",
    C: "example"
  });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("sideEnv puts this checkout over the main checkout", () => {
  const here = tmp("here-");
  const main = tmp("main-");
  fs.writeFileSync(
    path.join(here, ".env.example"),
    "REDIS_URL=redis://localhost:6379\nX=example\n"
  );
  fs.writeFileSync(
    path.join(main, ".env"),
    "REDIS_URL=redis://cloud:17199\nY=main\n"
  );
  // a worktree with no .env of its own reads the main checkout's real values
  expect(sideEnv([here, main], [".env"])).toEqual({
    REDIS_URL: "redis://cloud:17199",
    X: "example",
    Y: "main"
  });
  fs.writeFileSync(path.join(here, ".env"), "Y=here\n");
  expect(sideEnv([here, main], [".env"]).Y).toBe("here");
  fs.rmSync(here, { recursive: true, force: true });
  fs.rmSync(main, { recursive: true, force: true });
});

test("mainCheckoutRoot follows a worktree's .git file and ignores a normal checkout", () => {
  const main = tmp("repo-");
  fs.mkdirSync(path.join(main, ".git", "worktrees", "feat"), {
    recursive: true
  });
  const wt = path.join(main, ".worktrees", "feat");
  fs.mkdirSync(wt, { recursive: true });
  fs.writeFileSync(
    path.join(wt, ".git"),
    `gitdir: ${path.join(main, ".git", "worktrees", "feat")}\n`
  );
  expect(mainCheckoutRoot(wt)).toBe(main);
  expect(mainCheckoutRoot(main)).toBeUndefined();
  fs.rmSync(main, { recursive: true, force: true });
});
