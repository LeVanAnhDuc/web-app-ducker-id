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

/**
 * Short enough that a rename or delete reaches the /apps filter quickly, long
 * enough to absorb a burst of launcher loads (DR-19).
 */
const PUBLIC_CACHE_CONTROL = "public, max-age=60";

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  list = async () => this.service.list();

  listPublic = async (_req: Request, res: Response) => {
    const data = await this.service.listPublic();
    res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    return data;
  };

  create = async (req: CreateCategoryRequest) => this.service.create(req.body);

  update = async (req: UpdateCategoryRequest) =>
    this.service.update(req.params.id, req.body);

  move = async (req: MoveCategoryRequest) =>
    this.service.move(req.params.id, req.body.direction);

  deleteImpact = async (req: CategoryIdRequest) =>
    this.service.deleteImpact(req.params.id);

  remove = async (req: DeleteCategoryRequest) => {
    await this.service.remove(req.params.id, req.body.reassignments);
  };
}
