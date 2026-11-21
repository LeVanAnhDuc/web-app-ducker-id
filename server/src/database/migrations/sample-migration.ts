// types
import type { mongo } from "mongoose";

/**
 * What changes and why.
 *
 * Rules: src/database/migrations/README.md
 */

export const up = async (_db: mongo.Db): Promise<void> => {
  // Rename _db to db once used. Touch only documents still in the old
  // shape, so a run that failed halfway can simply run again
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // Revert `up`, and work on half-migrated data. If the change deletes data,
  // throw instead: "<name> cannot be reverted — restore from backup"
};
