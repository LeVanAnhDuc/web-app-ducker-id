// types
import type { CategoryMoveDirection, CategoryReassignment } from "../types";
import type {
  CreateCategoryBodyDto,
  UpdateCategoryBodyDto
} from "../dtos/requests";
import type { DeleteImpactDto } from "../dtos";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { CategoryRepository } from "../repository/category.repository";
// common
import { toDto } from "@/common/dto";
import { Transactional } from "@/common/stereotypes";
import { ConflictRequestError, NotFoundError } from "@/exceptions";
// dtos
import {
  AdminCategoryDto,
  PublicCategoryDto,
  toDeleteImpactDto
} from "../dtos";
// modules
import { CATEGORY_MOVE_DIRECTIONS } from "../constants";
// others
import { generateSlug, withSlugRetry } from "./shared/generate-slug";
import { remove } from "./remove";
import { update } from "./update";
import { ERROR_CODES } from "@/constants/error-code";

export class CategoryService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly webAppRepo: WebAppRepository
  ) {}

  async list(): Promise<AdminCategoryDto[]> {
    const docs = await this.categoryRepo.findAllWithAppCount();
    return toDto(AdminCategoryDto, docs);
  }

  async listPublic(): Promise<PublicCategoryDto[]> {
    const docs = await this.categoryRepo.findAll();
    return toDto(PublicCategoryDto, docs);
  }

  async create(body: CreateCategoryBodyDto): Promise<AdminCategoryDto> {
    const { name } = body;

    if (await this.categoryRepo.existsByNameEn(name.en)) {
      throw new ConflictRequestError({
        key: "category:errors.nameTaken",
        code: ERROR_CODES.CATEGORY_NAME_TAKEN
      });
    }

    const doc = await withSlugRetry(async () => {
      const slug = await generateSlug(this.categoryRepo, name.en);
      const sortOrder = (await this.categoryRepo.findMaxSortOrder()) + 1;
      return this.categoryRepo.create({ slug, name, sortOrder });
    });

    return toDto(AdminCategoryDto, { ...doc, appCount: 0 });
  }

  update(id: string, body: UpdateCategoryBodyDto): Promise<AdminCategoryDto> {
    return update(
      { categoryRepo: this.categoryRepo, webAppRepo: this.webAppRepo },
      id,
      body
    );
  }

  /**
   * Rewrites every `sortOrder` to its index instead of swapping two values: two
   * concurrent creates can leave equal `sortOrder`s, and a swap between equals
   * changes nothing. Moving past either end is a no-op, not an error — another
   * tab may already have moved the row there.
   *
   * Runs in the transaction `CategoryService.move` opens (`@Transactional()`).
   */
  @Transactional()
  async move(
    id: string,
    direction: CategoryMoveDirection
  ): Promise<AdminCategoryDto[]> {
    const ordered = (await this.categoryRepo.findAll()).map((doc) =>
      doc._id.toString()
    );
    const from = ordered.indexOf(id);
    if (from === -1) {
      throw new NotFoundError({
        key: "category:errors.notFound",
        code: ERROR_CODES.CATEGORY_NOT_FOUND
      });
    }

    const to = direction === CATEGORY_MOVE_DIRECTIONS.UP ? from - 1 : from + 1;
    if (to >= 0 && to < ordered.length) {
      [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    }

    await this.categoryRepo.setSortOrders(ordered);

    return this.list();
  }

  async deleteImpact(id: string): Promise<DeleteImpactDto> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError({
        key: "category:errors.notFound",
        code: ERROR_CODES.CATEGORY_NOT_FOUND
      });
    }

    const [total, orphaned] = await Promise.all([
      this.webAppRepo.countByCategory(id),
      this.webAppRepo.findOrphansOf(id)
    ]);
    return toDeleteImpactDto(total, orphaned);
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
