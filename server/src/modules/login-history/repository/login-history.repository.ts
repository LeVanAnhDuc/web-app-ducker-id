// types
import type {
  CreateLoginHistoryData,
  LoginHistoryDocument,
  LoginHistoryFilter,
  LoginStatsAggregationResult,
  LoginStatsRange,
  SignInTraits
} from "@/modules/login-history/types";
import type { PaginationOptions } from "@/types/common";

export interface LoginHistoryRepository {
  create(data: CreateLoginHistoryData): Promise<LoginHistoryDocument>;
  findByUser(
    filter: LoginHistoryFilter,
    options: PaginationOptions
  ): Promise<{ data: LoginHistoryDocument[]; total: number }>;
  findAll(
    filter: LoginHistoryFilter,
    options: PaginationOptions
  ): Promise<{ data: LoginHistoryDocument[]; total: number }>;
  aggregateMyStats(
    range: LoginStatsRange
  ): Promise<LoginStatsAggregationResult>;
  findById(id: string): Promise<LoginHistoryDocument | null>;
  /** Devices and countries of the user's successful IdP sign-ins since `since`. */
  findSignInTraits(userId: string, since: Date): Promise<SignInTraits>;
}
