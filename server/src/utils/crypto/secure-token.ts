// libs
import crypto from "crypto";

export const generateSecureToken = (length: number): string =>
  crypto.randomBytes(length).toString("hex");
