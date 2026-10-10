// types
import type { Request } from "express";
// others
import { SESSION_COOKIE } from "../constants";

/** Đọc sid từ cookie. Chuỗi rỗng coi như không có phiên. */
export const readSid = (req: Request): string | null => {
  const raw = (req.cookies as Record<string, string> | undefined)?.[
    SESSION_COOKIE
  ];
  return raw || null;
};
