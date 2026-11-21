// types
import type { Request } from "express";
import type { TokenService } from "./services";

export class TokenController {
  constructor(private readonly service: TokenService) {}

  refreshToken = async (req: Request) =>
    this.service.refreshAccessToken(req.cookies?.refreshToken);
}
