// Requirement ↔ test case ↔ spec ↔ defect check for src/; --write regenerates
// src/docs/traceability-matrix.md.
//   pnpm coverage:check
//   pnpm coverage:check --write
// Derived from the scaffold-automation-testing skill's checker; the Ducker ID
// additions are the @smoke ⇔ P0 rule and struck-through (removed) requirements.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, join, relative } from "node:path";

interface TestCase {
  id: string;
  title: string;
  reqs: string[];
  automated: string[];
  manual?: string;
  priority?: string;
  file: string;
}

const args = process.argv.slice(2);
const write = args.includes("--write");
const suite = join(__dirname, "..");
const root = join(suite, "src");

function walk(dir: string, match: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path, match)
      : match(path)
        ? [path]
        : [];
  });
}

const rel = (p: string) => relative(root, p).split("\\").join("/");
// README.md in each docs folder holds format examples, not real entries.
const isDoc = (f: string) => f.endsWith(".md") && basename(f) !== "README.md";

const errors: string[] = [];

// docs/requirements/<module>.md: "# AUTH — title", then "- **REQ-AUTH-01** text".
// A removed requirement is struck through ("- ~~**REQ-AUTH-07**~~ …") and needs no test case.
interface Requirement {
  text: string;
  module: string;
  removed: boolean;
}
const requirements = new Map<string, Requirement>();
for (const file of walk(join(root, "docs/requirements"), isDoc).sort()) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const module = lines.find((l) => l.startsWith("# "))?.slice(2) ?? rel(file);
  for (const line of lines) {
    const m = line.match(/^- (~~)?\*\*(REQ-[A-Z]+-\d+)\*\*(~~)? (.*)$/);
    if (!m) continue;
    if (requirements.has(m[2])) errors.push(`${m[2]} is defined twice`);
    requirements.set(m[2], { text: m[4], module, removed: !!m[1] });
  }
}

// test-cases/<module>.md: "### TC-AUTH-001 — title", then **Requirement:**,
// **Priority:** and **Automated:** bullets
const testCases: TestCase[] = [];
for (const file of walk(join(root, "test-cases"), isDoc)) {
  let current: TestCase | undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const head = line.match(/^### (TC-[A-Z]+-\d{3}) — (.*)$/);
    if (head) {
      current = {
        id: head[1],
        title: head[2],
        reqs: [],
        automated: [],
        file: rel(file)
      };
      testCases.push(current);
      continue;
    }
    if (!current) continue;
    const req = line.match(/^- \*\*Requirement:\*\* (.*)$/);
    if (req) current.reqs = req[1].match(/REQ-[A-Z]+-\d+/g) ?? [];
    const priority = line.match(/\*\*Priority:\*\* (P\d)/);
    if (priority) current.priority = priority[1];
    const auto = line.match(/^- \*\*Automated:\*\* (.*)$/);
    if (auto) {
      if (/^manual\b/.test(auto[1])) current.manual = auto[1];
      else
        current.automated = [
          ...auto[1].matchAll(/`([^`]+\.(?:e2e|api)\.ts)`/g)
        ].map((m) => m[1]);
    }
  }
}

// tests/**/*.ts: every @TC-… tag and the spec file carrying it
const tagsBySpec = new Map<string, Set<string>>();
for (const file of walk(join(root, "tests"), (f) => f.endsWith(".ts"))) {
  const tags = new Set(
    [...readFileSync(file, "utf8").matchAll(/@(TC-[A-Z]+-\d{3})\b/g)].map(
      (m) => m[1]
    )
  );
  if (tags.size) tagsBySpec.set(rel(file), tags);
}

const byId = new Map<string, TestCase>();
for (const tc of testCases) {
  if (byId.has(tc.id))
    errors.push(
      `${tc.id} is defined twice (${byId.get(tc.id)!.file}, ${tc.file})`
    );
  byId.set(tc.id, tc);
  if (!tc.reqs.length) errors.push(`${tc.id} names no requirement`);
  for (const r of tc.reqs)
    if (!requirements.has(r)) errors.push(`${tc.id} names unknown ${r}`);
  if (!/^P[012]$/.test(tc.priority ?? ""))
    errors.push(`${tc.id} has no **Priority:** P0 / P1 / P2`);
  if (!tc.manual && !tc.automated.length)
    errors.push(`${tc.id} has no **Automated:** path (or "manual — <reason>")`);
  for (const path of tc.automated) {
    if (!existsSync(join(root, path)))
      errors.push(`${tc.id} → ${path} does not exist`);
    else if (!tagsBySpec.get(path)?.has(tc.id))
      errors.push(`${tc.id} → ${path} has no test tagged @${tc.id}`);
  }
}
for (const [id, req] of requirements) {
  if (!req.removed && !testCases.some((tc) => tc.reqs.includes(id)))
    errors.push(`${id} has no test case`);
}
for (const [spec, tags] of tagsBySpec) {
  for (const tag of tags)
    if (!byId.has(tag))
      errors.push(`${spec} carries @${tag}, which no test case defines`);
}

// @smoke ⇔ P0. Tags are read from Playwright's own listing, so a tag on a
// describe() reaches every test inside it exactly as at run time.
interface ListedSpec {
  title: string;
  file: string;
  tags?: string[];
}
interface ListedSuite {
  specs?: ListedSpec[];
  suites?: ListedSuite[];
}
const listing = JSON.parse(
  execFileSync(
    process.execPath,
    [
      require.resolve("@playwright/test/cli"),
      "test",
      "--project=app",
      "--list",
      "--reporter=json"
    ],
    { cwd: suite, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  )
) as { suites: ListedSuite[] };
const listed: ListedSpec[] = [];
const collect = (s: ListedSuite) => {
  listed.push(...(s.specs ?? []));
  (s.suites ?? []).forEach(collect);
};
listing.suites.forEach(collect);
const smokeTcs = new Set<string>();
for (const t of listed) {
  const tags = (t.tags ?? []).map((x) => x.replace(/^@/, ""));
  if (!tags.includes("smoke")) continue;
  for (const tag of tags) if (tag.startsWith("TC-")) smokeTcs.add(tag);
}
for (const tc of testCases) {
  if (tc.manual) continue;
  if (tc.priority === "P0" && !smokeTcs.has(tc.id))
    errors.push(`${tc.id} is P0 but none of its tests is tagged @smoke`);
  if (tc.priority !== "P0" && smokeTcs.has(tc.id))
    errors.push(
      `${tc.id} is ${tc.priority}, but a test tagged @smoke proves it — @smoke is for P0`
    );
}

// defects/<module>.md: "### BUG-AUTH-01" headings, open under "## Đang mở", fixed under "## Đã sửa";
// specs mark an open bug with "// BUG: defects/<module>.md#bug-auth-01" right above test.fail().
interface Bug {
  id: string;
  file: string;
  open: boolean;
  tcs: string[];
}
const bugs = new Map<string, Bug>();
for (const file of walk(join(root, "defects"), isDoc)) {
  let open = true;
  let current: Bug | undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (/^## Đã sửa/.test(line)) open = false;
    else if (/^## Đang mở/.test(line)) open = true;
    const head = line.match(/^### (BUG-[A-Z]+-\d+)\s*$/);
    if (head) {
      if (bugs.has(head[1]))
        errors.push(
          `${head[1]} is defined twice (${bugs.get(head[1])!.file}, ${rel(file)})`
        );
      current = { id: head[1], file: rel(file), open, tcs: [] };
      bugs.set(head[1], current);
      continue;
    }
    const tc = line.match(/^- \*\*TC:\*\* (.*)$/);
    if (tc && current) current.tcs = tc[1].match(/TC-[A-Z]+-\d{3}/g) ?? [];
  }
}
const markedBugs = new Set<string>();
for (const file of walk(join(root, "tests"), (f) => f.endsWith(".ts"))) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/\/\/ BUG: (\S+?)#([\w-]+)/);
    if (!m) return;
    const where = `${rel(file)}:${i + 1}`;
    const bug = bugs.get(m[2].toUpperCase());
    if (!bug || bug.file !== m[1])
      return errors.push(
        `${where} points to ${m[1]}#${m[2]}, which does not exist`
      );
    if (!bug.open)
      return errors.push(
        `${where} still marks ${bug.id}, which is fixed — remove test.fail()`
      );
    if (!lines.slice(i + 1, i + 4).some((l) => /test\.fail\(/.test(l)))
      errors.push(`${where} marks ${bug.id} but no test.fail() follows`);
    // The marker sits inside the test that proves the bug: the nearest
    // @TC-… tags above it must include one of the bug's **TC:**.
    for (let j = i; j >= 0; j--) {
      const tags = lines[j].match(/@TC-[A-Z]+-\d{3}/g);
      if (!tags) continue;
      if (!tags.some((t) => bug.tcs.includes(t.slice(1))))
        errors.push(
          `${where} marks ${bug.id} inside a test tagged ${tags.join(", ")}, but the bug names ${bug.tcs.join(", ")}`
        );
      break;
    }
    markedBugs.add(bug.id);
  });
}
for (const bug of bugs.values()) {
  if (!bug.tcs.length) errors.push(`${bug.id} names no **TC:**`);
  for (const id of bug.tcs)
    if (!byId.has(id)) errors.push(`${bug.id} names unknown ${id}`);
  if (bug.open && !markedBugs.has(bug.id))
    errors.push(
      `${bug.id} is open but no spec marks it with // BUG: + test.fail()`
    );
}

if (write) {
  const manual = testCases.filter((tc) => tc.manual).length;
  const live = [...requirements].filter(([, r]) => !r.removed);
  const covered = live.filter(([id]) =>
    testCases.some((tc) => tc.reqs.includes(id))
  ).length;
  // One section per requirements file, in file order.
  const sections: string[] = [];
  for (const module of new Set(
    [...requirements.values()].map((r) => r.module)
  )) {
    sections.push(
      `## ${module}`,
      "",
      "| Requirement | Test cases | Automated in |",
      "| --- | --- | --- |"
    );
    for (const [id, req] of requirements) {
      if (req.module !== module) continue;
      const cases = testCases.filter((tc) => tc.reqs.includes(id));
      const specs = [...new Set(cases.flatMap((tc) => tc.automated))].map(
        (p) => `\`${p}\``
      );
      const label = req.removed ? `~~**${id}**~~` : `**${id}**`;
      sections.push(
        `| ${label} ${req.text.replace(/\|/g, "\\|")} | ${cases.map((tc) => tc.id).join(", ")} | ${specs.join("<br>")} |`
      );
    }
    sections.push("");
  }
  writeFileSync(
    join(root, "docs/traceability-matrix.md"),
    [
      "# Traceability matrix",
      "",
      "Sinh bởi `pnpm coverage:check --write` — không sửa tay.",
      "",
      `**${live.length}** requirement · **${covered}** đã phủ · **${testCases.length}** test case ` +
        `(${testCases.length - manual} tự động, ${manual} thủ công)`,
      "",
      ...sections
    ].join("\n")
  );
}

if (errors.length) {
  console.error(
    `coverage:check: ${errors.length} problem(s)\n` +
      errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}
console.log(
  `coverage:check: ${requirements.size} requirements, ${testCases.length} test cases, ` +
    `${tagsBySpec.size} tagged spec files, ${smokeTcs.size} smoke test cases, ` +
    `${markedBugs.size} open bugs — OK${write ? " (matrix written)" : ""}`
);
