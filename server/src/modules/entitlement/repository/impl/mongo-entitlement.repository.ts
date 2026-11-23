// libs
import { Types } from "mongoose";
// types
import type {
  EntitlementDocument,
  EntitlementOverride,
  EntitlementPair,
  EntitlementUpsert
} from "@/modules/entitlement/types";
import type { EntitlementRepository } from "../entitlement.repository";
// models
import EntitlementModel from "@/models/entitlement";

type OverrideRow = Pick<EntitlementDocument, "userId" | "webAppId" | "effect">;

const toOverride = (row: OverrideRow): EntitlementOverride => ({
  userId: row.userId.toString(),
  webAppId: row.webAppId.toString(),
  effect: row.effect
});

const pairFilter = ({ userId, webAppId }: EntitlementPair) => ({
  userId: new Types.ObjectId(userId),
  webAppId: new Types.ObjectId(webAppId)
});
// common
import { Repository } from "@/common/stereotypes";

@Repository()
export class MongoEntitlementRepository implements EntitlementRepository {
  async findByUser(userId: string): Promise<EntitlementOverride[]> {
    const rows = await EntitlementModel.find({
      userId: new Types.ObjectId(userId)
    })
      .select("userId webAppId effect")
      .lean<OverrideRow[]>()
      .exec();
    return rows.map(toOverride);
  }

  async findByUsers(userIds: string[]): Promise<EntitlementOverride[]> {
    if (userIds.length === 0) return [];
    const rows = await EntitlementModel.find({
      userId: { $in: userIds.map((id) => new Types.ObjectId(id)) }
    })
      .select("userId webAppId effect")
      .lean<OverrideRow[]>()
      .exec();
    return rows.map(toOverride);
  }

  async applyChanges({
    upserts,
    deletes
  }: {
    upserts: EntitlementUpsert[];
    deletes: EntitlementPair[];
  }): Promise<void> {
    if (upserts.length === 0 && deletes.length === 0) return;
    await EntitlementModel.bulkWrite(
      [
        ...upserts.map((change) => ({
          updateOne: {
            filter: pairFilter(change),
            update: {
              $set: {
                effect: change.effect,
                updatedBy: new Types.ObjectId(change.updatedBy)
              }
            },
            upsert: true
          }
        })),
        ...deletes.map((pair) => ({
          deleteOne: { filter: pairFilter(pair) }
        }))
      ],
      { ordered: false }
    );
  }
}
