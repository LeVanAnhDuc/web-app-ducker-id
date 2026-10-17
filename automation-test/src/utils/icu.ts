// Renders the subset of ICU MessageFormat the client catalogues use:
// `{name}` arguments, `{key, select, a {…} other {…}}` branches (nested) and
// `{count, plural, one {# app} other {# apps}}` (English rules: `=N`, `one`, `other`).
// next-intl renders the same message in the browser, so a spec can build the
// sentence the page shows from the catalogue instead of copying it.
//
//   formatIcu("{actor, select, admin {Reset by an admin} other {Changed}}", { actor: "admin" })
//     → "Reset by an admin"

type Values = Record<string, string | number>;

/** Index of the `}` that closes the `{` at `open`. */
function closingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`formatIcu: unbalanced braces in "${text}"`);
}

/** `a {…} other {…}` → { a: "…", other: "…" } */
function branches(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < text.length) {
    const head = /^\s*([=\w-]+)\s*\{/.exec(text.slice(i));
    if (!head) break;
    const open = i + head[0].length - 1;
    const close = closingBrace(text, open);
    out[head[1]] = text.slice(open + 1, close);
    i = close + 1;
  }
  return out;
}

export function formatIcu(message: string, values: Values = {}): string {
  let out = "";
  let i = 0;
  while (i < message.length) {
    if (message[i] !== "{") {
      out += message[i];
      i += 1;
      continue;
    }
    const close = closingBrace(message, i);
    const inner = message.slice(i + 1, close);
    const select = /^\s*(\w+)\s*,\s*select\s*,/.exec(inner);
    const plural = /^\s*(\w+)\s*,\s*plural\s*,/.exec(inner);
    if (plural) {
      // English plural rules are all the catalogues need: `=N`, `one`, `other`.
      const options = branches(inner.slice(plural[0].length));
      const n = Number(values[plural[1]]);
      const branch =
        options[`=${n}`] ??
        (n === 1 ? options.one : undefined) ??
        options.other;
      out += formatIcu((branch ?? "").replace(/#/g, String(n)), values);
    } else if (select) {
      const options = branches(inner.slice(select[0].length));
      const key = String(values[select[1]] ?? "other");
      out += formatIcu(options[key] ?? options.other ?? "", values);
    } else {
      const name = inner.trim();
      out += name in values ? String(values[name]) : `{${inner}}`;
    }
    i = close + 1;
  }
  return out;
}
