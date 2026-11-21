// libs
import { Get, JsonController } from "routing-controllers";
// types
import type { ContactAdminService } from "./services";
// common
import { Auth, PathVariable, RequestParam, Respond } from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { RequestContext } from "@/utils/request-context";
import { MyContactsQueryDto } from "./dtos/requests";

@JsonController("/contacts")
@Auth()
export class MyContactsController {
  constructor(private readonly service: ContactAdminService) {}

  @Get("/")
  @Respond({ message: "contactAdmin:success.getMyContacts" })
  getMyContacts(@RequestParam(MyContactsQueryDto) query: MyContactsQueryDto) {
    return this.service.getMyContacts(RequestContext.requireUserId(), query);
  }

  @Get("/:id")
  @Respond({ message: "contactAdmin:success.getMyContactDetail" })
  getMyContactDetail(
    @PathVariable("id", IsRequiredObjectId("contactAdmin:errors.invalidId"))
    id: string
  ) {
    return this.service.getMyContactDetail(id, RequestContext.requireUserId());
  }
}
