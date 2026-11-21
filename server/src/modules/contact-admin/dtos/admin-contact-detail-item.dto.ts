// common
import { ExposeId, ExposeOrNull } from "@/common/dto";
// others
import { ContactDetailItemDto } from "./contact-detail-item.dto";

// The admin view of a request adds who filed it. The owner's own view
// (GET /contacts/:id) keeps ContactDetailItemDto, without these two fields.
export class AdminContactDetailItemDto extends ContactDetailItemDto {
  @ExposeId() userId!: string | null;
  @ExposeOrNull() ipAddress!: string | null;
}
