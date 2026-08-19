// types
import type {
  MyHistoryRequest,
  AllHistoryRequest,
  HistoryIdParamRequest
} from "@/modules/login-history/types";
import type { Request, Response } from "express";
import type { LoginHistoryService } from "./login-history.service";
// common
import { OkSuccess } from "@/common/responses";

export class LoginHistoryController {
  constructor(private readonly service: LoginHistoryService) {}

  getMyHistory = async (
    req: MyHistoryRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getMyLoginHistory(req.query);
    new OkSuccess({ data, message: "loginHistory:success.getMyHistory" }).send(
      req,
      res
    );
  };

  getMyStats = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getMyLoginStats();
    new OkSuccess({ data, message: "loginHistory:success.getMyStats" }).send(
      req,
      res
    );
  };

  getAllHistory = async (
    req: AllHistoryRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getAllLoginHistory(req.query);
    new OkSuccess({
      data,
      message: "loginHistory:success.getAllHistory"
    }).send(req, res);
  };

  getHistoryDetail = async (
    req: HistoryIdParamRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getLoginHistoryDetail(req.params.id);
    new OkSuccess({
      data,
      message: "loginHistory:success.getHistoryDetail"
    }).send(req, res);
  };
}
