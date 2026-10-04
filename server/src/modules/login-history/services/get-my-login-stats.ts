// types
import type { MyLoginStatsDto } from "../dtos";
import type { LoginHistoryRepository } from "../repository/login-history.repository";
// modules
import { LOGIN_HISTORY_STATS } from "@/modules/login-history/constants";
// dtos
import { toMyLoginStatsDto } from "../dtos";
// others
import { RequestContext } from "@/utils/request-context";
import { MILLISECONDS_PER_DAY } from "@/constants/time";

export const getMyLoginStats = async (
  loginHistoryRepo: LoginHistoryRepository
): Promise<MyLoginStatsDto> => {
  const userId = RequestContext.requireAuthId();
  const to = new Date();
  const from = new Date(
    to.getTime() - LOGIN_HISTORY_STATS.DEFAULT_RANGE_DAYS * MILLISECONDS_PER_DAY
  );

  const aggregation = await loginHistoryRepo.aggregateMyStats({
    userId,
    from,
    to
  });

  return toMyLoginStatsDto(aggregation, { from, to });
};
