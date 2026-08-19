// Explicit registry of known category slugs → their i18n key under the
// `common.categories` namespace. Adding a new category = add one line here
// plus the matching entry in src/locales/{en,vi}/common.json.
export const CATEGORY_LABEL_KEY: Record<string, string> = {
  content: "content",
  tools: "tools",
  identity: "identity",
  productivity: "productivity"
};
