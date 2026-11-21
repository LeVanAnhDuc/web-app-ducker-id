// common
import { PageMeta } from "@/common/pagination";
// others
import { ApiProperty } from "./api-property";

type Page<T> = new () => { items: T[]; meta: PageMeta };

const pages = new Map<Function, Page<unknown>>();

/**
 * The response DTO of one page of `Dto`: a class named `<Dto>Page` with
 * `items: Dto[]` and `meta: PageMeta`. Cached per `Dto`, so every route that
 * returns pages of it shares one schema of one name.
 */
export const Paginated = <T>(Dto: new () => T): Page<T> => {
  const cached = pages.get(Dto);
  if (cached) return cached as Page<T>;

  class DtoPage {
    items!: T[];
    meta!: PageMeta;
  }
  Object.defineProperty(DtoPage, "name", { value: `${Dto.name}Page` });
  ApiProperty({ type: [Dto] })(DtoPage.prototype, "items");
  ApiProperty({ type: PageMeta })(DtoPage.prototype, "meta");

  pages.set(Dto, DtoPage);
  return DtoPage;
};
