// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { ContactAdminService } from "./services";
// common
import { ApiErrors, Paginated } from "@/common/openapi";
import {
  Admin,
  Auth,
  Respond,
  ValidBody,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import {
  AdminContactDetailItemDto,
  ContactListItemDto,
  UpdateContactStatusDto
} from "./dtos";
import {
  AdminContactsQueryDto,
  ContactIdParamsDto,
  UpdateContactStatusBodyDto
} from "./dtos/requests";

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
    @ValidQuery(AdminContactsQueryDto) query: AdminContactsQueryDto
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
  getContactDetail(
    @ValidParams(ContactIdParamsDto) params: ContactIdParamsDto
  ) {
    return this.service.getContactDetail(params.id);
  }

  @Patch("/:id/status")
  @OpenAPI({ summary: "Move a contact request to another status (admin)" })
  @ApiErrors(404)
  @Respond({
    message: "contactAdmin:success.updateContactStatus",
    type: UpdateContactStatusDto
  })
  updateContactStatus(
    @ValidParams(ContactIdParamsDto) params: ContactIdParamsDto,
    @ValidBody(UpdateContactStatusBodyDto) body: UpdateContactStatusBodyDto
  ) {
    return this.service.updateContactStatus(params.id, body.status);
  }
}
