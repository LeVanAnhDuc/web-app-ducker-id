// database
import instanceMongoDB from "@/database/mongodb";
// models
import AuthenticationModel from "@/models/authentication";
// others
import { Logger } from "@/libs/logger";

/**
 * Dọn 3 field còn sót của luồng unlock cũ: mật khẩu tạm đã chuyển sang Redis
 * (key `login-unlock-token:<email>`, TTL 15 phút) nên `tempPasswordHash`,
 * `tempPasswordExpAt` và `tempPasswordUsed` không còn ý nghĩa — và vì không có
 * TTL index nào dọn chúng, hash cũ vẫn nằm lại trong `auths` sau mỗi lần unlock.
 *
 * Đi thẳng qua native driver (`.collection`) chứ không qua Mongoose model: 3
 * field này đã bị gỡ khỏi schema, strict mode sẽ lặng lẽ bỏ qua `$unset` của
 * field không khai báo.
 *
 * Idempotent — chạy lại lần hai cho `modified: 0`.
 */
const TEMP_PASSWORD_FIELDS = [
  "tempPasswordHash",
  "tempPasswordExpAt",
  "tempPasswordUsed"
] as const;

const dropTempPasswordFields = async (): Promise<void> => {
  try {
    Logger.info("Connecting to MongoDB...");
    await instanceMongoDB.connect();

    const filter = {
      $or: TEMP_PASSWORD_FIELDS.map((field) => ({ [field]: { $exists: true } }))
    };
    const unset = Object.fromEntries(
      TEMP_PASSWORD_FIELDS.map((field) => [field, ""])
    );

    const result = await AuthenticationModel.collection.updateMany(filter, {
      $unset: unset
    });

    Logger.info("Dropped legacy temp-password fields from auths", {
      fields: TEMP_PASSWORD_FIELDS,
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (error) {
    Logger.error("Migration drop-temp-password-fields failed", error);
    await instanceMongoDB.disconnect();
    process.exit(1);
  }

  await instanceMongoDB.disconnect();
  process.exit(0);
};

dropTempPasswordFields();
