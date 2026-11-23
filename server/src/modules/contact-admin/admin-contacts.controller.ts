// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { ContactAdminService } from "./contact-admin.service";
// common
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
  AdminContactsQueryDto,
  UpdateContactStatusBodyDto
} from "./dtos/requests";

@JsonController("/admin/contacts")
@Auth()
@Admin()
export class AdminContactsController {
  constructor(private readonly service: ContactAdminService) {}

  @Get("/")
  @Respond({ message: "contactAdmin:success.getContactList" })
  getContactList(
    @RequestParam(AdminContactsQueryDto) query: AdminContactsQueryDto
  ) {
    return this.service.getContactList(query);
  }

  @Get("/:id")
  @Respond({ message: "contactAdmin:success.getContactDetail" })
  getContactDetail(
    @PathVariable("id", IsRequiredObjectId("contactAdmin:errors.invalidId"))
    id: string
  ) {
    return this.service.getContactDetail(id);
  }

  @Patch("/:id/status")
  @Respond({ message: "contactAdmin:success.updateContactStatus" })
  updateContactStatus(
    @PathVariable("id", IsRequiredObjectId("contactAdmin:errors.invalidId"))
    id: string,
    @ValidBody(UpdateContactStatusBodyDto) body: UpdateContactStatusBodyDto
  ) {
    return this.service.updateContactStatus(id, body.status);
  }
}
