// types
import type { mongo } from "mongoose";

/**
 * Removes the three fields left by the old unlock flow. The temporary
 * password now lives in Redis (`login-unlock-token:<email>`, 15-minute TTL),
 * and with no TTL index on these fields an old hash stayed in `auths` after
 * every unlock.
 */
const FIELDS = ["tempPasswordHash", "tempPasswordExpAt", "tempPasswordUsed"];

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection("auths")
    .updateMany(
      { $or: FIELDS.map((field) => ({ [field]: { $exists: true } })) },
      { $unset: Object.fromEntries(FIELDS.map((field) => [field, ""])) }
    );
};

/** Irreversible: the values were deleted, and nothing reads them any more. */
export const down = async (): Promise<void> => {
  throw new Error(
    "drop-temp-password-fields cannot be reverted — restore from backup"
  );
};
