// libs
import { Get, JsonController } from "routing-controllers";
// types
import type { ContactAdminService } from "./services";
// common
import { Auth, Respond, ValidParams, ValidQuery } from "@/common/routing";
// others
import { RequestContext } from "@/utils/request-context";
import { ContactIdParamsDto, MyContactsQueryDto } from "./dtos/requests";

@JsonController("/contacts")
@Auth()
export class MyContactsController {
  constructor(private readonly service: ContactAdminService) {}

  @Get("/")
  @Respond({ message: "contactAdmin:success.getMyContacts" })
  getMyContacts(@ValidQuery(MyContactsQueryDto) query: MyContactsQueryDto) {
    return this.service.getMyContacts(RequestContext.requireUserId(), query);
  }

  @Get("/:id")
  @Respond({ message: "contactAdmin:success.getMyContactDetail" })
  getMyContactDetail(
    @ValidParams(ContactIdParamsDto) params: ContactIdParamsDto
  ) {
    return this.service.getMyContactDetail(
      params.id,
      RequestContext.requireUserId()
    );
  }
}
