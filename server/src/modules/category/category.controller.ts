// types
import type { Request, Response } from "express";
import type { CategoryService } from "./services";
import type {
  CategoryIdRequest,
  CreateCategoryRequest,
  DeleteCategoryRequest,
  MoveCategoryRequest,
  UpdateCategoryRequest
} from "./types";
// common
import {
  CreatedSuccess,
  NoContentSuccess,
  OkSuccess
} from "@/common/responses";

/**
 * Short enough that a rename or delete reaches the /apps filter quickly, long
 * enough to absorb a burst of launcher loads (DR-19).
 */
const PUBLIC_CACHE_CONTROL = "public, max-age=60";

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list();
    new OkSuccess({ data, message: "category:success.list" }).send(req, res);
  };

  listPublic = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.listPublic();
    res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    new OkSuccess({ data, message: "category:success.list" }).send(req, res);
  };

  create = async (req: CreateCategoryRequest, res: Response): Promise<void> => {
    const data = await this.service.create(req.body);
    new CreatedSuccess({ data, message: "category:success.create" }).send(
      req,
      res
    );
  };

  update = async (req: UpdateCategoryRequest, res: Response): Promise<void> => {
    const data = await this.service.update(req.params.id, req.body);
    new OkSuccess({ data, message: "category:success.update" }).send(req, res);
  };

  move = async (req: MoveCategoryRequest, res: Response): Promise<void> => {
    const data = await this.service.move(req.params.id, req.body.direction);
    new OkSuccess({ data, message: "category:success.move" }).send(req, res);
  };

  deleteImpact = async (
    req: CategoryIdRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.deleteImpact(req.params.id);
    new OkSuccess({ data, message: "category:success.deleteImpact" }).send(
      req,
      res
    );
  };

  remove = async (req: DeleteCategoryRequest, res: Response): Promise<void> => {
    await this.service.remove(req.params.id, req.body.reassignments);
    new NoContentSuccess().send(req, res);
  };
}
