// types
import type {
  CategoryMoveDirection,
  CategoryReassignment,
  CreateCategoryBody,
  UpdateCategoryBody
} from "../types";
import type {
  AdminCategoryDto,
  DeleteImpactDto,
  PublicCategoryDto
} from "../dtos";
import type { CategoryServiceDeps } from "./deps";
// others
import { create } from "./create";
import { deleteImpact } from "./delete-impact";
import { list } from "./list";
import { listPublic } from "./list-public";
import { move } from "./move";
import { remove } from "./remove";
import { update } from "./update";

export class CategoryService {
  constructor(private readonly deps: CategoryServiceDeps) {}

  list(): Promise<AdminCategoryDto[]> {
    return list(this.deps);
  }

  listPublic(): Promise<PublicCategoryDto[]> {
    return listPublic(this.deps);
  }

  create(body: CreateCategoryBody): Promise<AdminCategoryDto> {
    return create(this.deps, body);
  }

  update(id: string, body: UpdateCategoryBody): Promise<AdminCategoryDto> {
    return update(this.deps, id, body);
  }

  move(
    id: string,
    direction: CategoryMoveDirection
  ): Promise<AdminCategoryDto[]> {
    return move(this.deps, id, direction);
  }

  deleteImpact(id: string): Promise<DeleteImpactDto> {
    return deleteImpact(this.deps, id);
  }

  remove(id: string, reassignments: CategoryReassignment[]): Promise<void> {
    return remove(this.deps, id, reassignments);
  }
}
