// common
import { ExposeId, ExposeOrNull } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// others
import { ContactDetailItemDto } from "./contact-detail-item.dto";

// The admin view of a request adds who filed it. The owner's own view
// (GET /contacts/:id) keeps ContactDetailItemDto, without these two fields.
export class AdminContactDetailItemDto extends ContactDetailItemDto {
  @ApiProperty({
    nullable: true,
    example: "507f1f77bcf86cd799439012",
    description: "The account that filed the request; null for a guest"
  })
  @ExposeId()
  userId!: string | null;

  @ApiProperty({
    example: "203.0.113.7",
    description: "The IP the request was filed from"
  })
  @ExposeOrNull()
  ipAddress!: string | null;
}
