// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { ContactAdminService } from "./services";
// common
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
  AdminContactsQueryDto,
  ContactIdParamsDto,
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
    @ValidQuery(AdminContactsQueryDto) query: AdminContactsQueryDto
  ) {
    return this.service.getContactList(query);
  }

  @Get("/:id")
  @Respond({ message: "contactAdmin:success.getContactDetail" })
  getContactDetail(
    @ValidParams(ContactIdParamsDto) params: ContactIdParamsDto
  ) {
    return this.service.getContactDetail(params.id);
  }

  @Patch("/:id/status")
  @Respond({ message: "contactAdmin:success.updateContactStatus" })
  updateContactStatus(
    @ValidParams(ContactIdParamsDto) params: ContactIdParamsDto,
    @ValidBody(UpdateContactStatusBodyDto) body: UpdateContactStatusBodyDto
  ) {
    return this.service.updateContactStatus(params.id, body.status);
  }
}
