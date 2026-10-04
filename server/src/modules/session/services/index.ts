// types
import type { Request, Response } from "express";
import type { SessionRecord } from "../types";
import type { SessionRepository } from "../repository/session.repository";
// others
import { readSid } from "../helpers";
import { end } from "./end";
import { registerClient } from "./register-client";
import { resolve } from "./resolve";
import { start } from "./start";

export class SessionService {
  constructor(private readonly repo: SessionRepository) {}

  start(params: {
    authId: string;
    userId: string;
    roles: string;
    req: Request;
    res: Response;
  }): Promise<SessionRecord> {
    return start(this.repo, params);
  }

  resolve(req: Request): Promise<SessionRecord | null> {
    return resolve(this.repo, req);
  }

  readSid(req: Request): string | null {
    return readSid(req);
  }

  registerClient(sid: string, clientId: string): Promise<void> {
    return registerClient(this.repo, sid, clientId);
  }

  end(req: Request, res: Response): Promise<void> {
    return end(this.repo, req, res);
  }
}
