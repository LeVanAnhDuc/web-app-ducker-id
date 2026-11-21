// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { ContactAdminService } from "./services";
// common
import { ApiErrors, ApiProperty, Paginated } from "@/common/openapi";
import {
  Admin,
  Auth,
  PathVariable,
  RequestParam,
  Respond,
  ValidBody
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import {
  AdminContactDetailItemDto,
  ContactListItemDto,
  UpdateContactStatusDto
} from "./dtos";
import {
  AdminContactsQueryDto,
  UpdateContactStatusBodyDto
} from "./dtos/requests";

// Every failure takes the one key; each keeps its own constraint name so
// `reason` still tells them apart.
const CONTACT_ID = [
  IsRequiredObjectId("contactAdmin:errors.invalidId"),
  ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the contact request"
  })
];

@JsonController("/admin/contacts")
@Auth()
@Admin()
@OpenAPI({ tags: ["Contact Admin"] })
export class AdminContactsController {
  constructor(private readonly service: ContactAdminService) {}

  @Get("/")
  @OpenAPI({ summary: "List every contact request (admin)" })
  @Respond({
    message: "contactAdmin:success.getContactList",
    type: Paginated(ContactListItemDto)
  })
  getContactList(
    @RequestParam(AdminContactsQueryDto) query: AdminContactsQueryDto
  ) {
    return this.service.getContactList(query);
  }

  @Get("/:id")
  @OpenAPI({
    summary: "Get any contact request (admin)",
    description:
      "The full request, including who filed it (`userId`, null for a guest) and the IP it came from."
  })
  @ApiErrors(404)
  @Respond({
    message: "contactAdmin:success.getContactDetail",
    type: AdminContactDetailItemDto
  })
  getContactDetail(@PathVariable("id", ...CONTACT_ID) id: string) {
    return this.service.getContactDetail(id);
  }

  @Patch("/:id/status")
  @OpenAPI({ summary: "Move a contact request to another status (admin)" })
  @ApiErrors(404)
  @Respond({
    message: "contactAdmin:success.updateContactStatus",
    type: UpdateContactStatusDto
  })
  updateContactStatus(
    @PathVariable("id", ...CONTACT_ID) id: string,
    @ValidBody(UpdateContactStatusBodyDto) body: UpdateContactStatusBodyDto
  ) {
    return this.service.updateContactStatus(id, body.status);
  }
}
