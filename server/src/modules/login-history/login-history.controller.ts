// types
import type {
  MyHistoryRequest,
  AllHistoryRequest,
  HistoryIdParamRequest,
  MyStatsRequest
} from "@/modules/login-history/types";
import type { LoginHistoryService } from "./services";

export class LoginHistoryController {
  constructor(private readonly service: LoginHistoryService) {}

  getMyHistory = async (req: MyHistoryRequest) =>
    this.service.getMyLoginHistory(req.query);

  getMyStats = async (req: MyStatsRequest) =>
    this.service.getMyLoginStats(req.query);

  getAllHistory = async (req: AllHistoryRequest) =>
    this.service.getAllLoginHistory(req.query);

  getHistoryDetail = async (req: HistoryIdParamRequest) =>
    this.service.getLoginHistoryDetail(req.params.id);
}
