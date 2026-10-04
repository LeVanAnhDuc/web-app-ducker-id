// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { CategoryRepository } from "../repository/category.repository";

export interface CategoryServiceDeps {
  categoryRepo: CategoryRepository;
  webAppRepo: WebAppRepository;
}
