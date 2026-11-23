// types
import type { CategoryMoveDirection, CategoryReassignment } from "../types";
import type {
  CreateCategoryBodyDto,
  UpdateCategoryBodyDto
} from "../dtos/requests";
import type {
  AdminCategoryDto,
  DeleteImpactDto,
  PublicCategoryDto
} from "../dtos";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { CategoryRepository } from "../repository/category.repository";
// common
import { Transactional } from "@/common/stereotypes";
// others
import { create } from "./create";
import { deleteImpact } from "./delete-impact";
import { list } from "./list";
import { listPublic } from "./list-public";
import { move } from "./move";
import { remove } from "./remove";
import { update } from "./update";

export class CategoryService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly webAppRepo: WebAppRepository
  ) {}

  list(): Promise<AdminCategoryDto[]> {
    return list(this.categoryRepo);
  }

  listPublic(): Promise<PublicCategoryDto[]> {
    return listPublic(this.categoryRepo);
  }

  create(body: CreateCategoryBodyDto): Promise<AdminCategoryDto> {
    return create(this.categoryRepo, body);
  }

  update(id: string, body: UpdateCategoryBodyDto): Promise<AdminCategoryDto> {
    return update(
      { categoryRepo: this.categoryRepo, webAppRepo: this.webAppRepo },
      id,
      body
    );
  }

  @Transactional()
  move(
    id: string,
    direction: CategoryMoveDirection
  ): Promise<AdminCategoryDto[]> {
    return move(this.categoryRepo, id, direction);
  }

  deleteImpact(id: string): Promise<DeleteImpactDto> {
    return deleteImpact(
      { categoryRepo: this.categoryRepo, webAppRepo: this.webAppRepo },
      id
    );
  }

  @Transactional()
  remove(id: string, reassignments: CategoryReassignment[]): Promise<void> {
    return remove(
      { categoryRepo: this.categoryRepo, webAppRepo: this.webAppRepo },
      id,
      reassignments
    );
  }
}
