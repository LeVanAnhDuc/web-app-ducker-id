import path from "node:path";
import { SUITE_ROOT } from "./env";

// Playwright storageState files the setup project writes and role fixtures read.
export const USER_AUTH_FILE = path.join(SUITE_ROOT, ".auth/user.json");
export const ADMIN_AUTH_FILE = path.join(SUITE_ROOT, ".auth/admin.json");
