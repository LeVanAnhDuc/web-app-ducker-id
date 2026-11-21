// libs
import { Get, JsonController } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { ContactAdminService } from "./services";
// common
import { ApiErrors, Paginated } from "@/common/openapi";
import { Auth, Respond, ValidParams, ValidQuery } from "@/common/routing";
// others
import { RequestContext } from "@/utils/request-context";
import { ContactDetailItemDto, ContactListItemDto } from "./dtos";
import { ContactIdParamsDto, MyContactsQueryDto } from "./dtos/requests";

@JsonController("/contacts")
@Auth()
@OpenAPI({ tags: ["Contact Admin"] })
export class MyContactsController {
  constructor(private readonly service: ContactAdminService) {}

  @Get("/")
  @OpenAPI({
    summary: "List my contact requests (owner-scoped)",
    description:
      "List contact requests submitted by the signed-in caller. Only contacts whose `userId` matches the caller are returned, never other users' or guest contacts."
  })
  @Respond({
    message: "contactAdmin:success.getMyContacts",
    type: Paginated(ContactListItemDto)
  })
  getMyContacts(@ValidQuery(MyContactsQueryDto) query: MyContactsQueryDto) {
    return this.service.getMyContacts(RequestContext.requireUserId(), query);
  }

  @Get("/:id")
  @OpenAPI({
    summary: "Get my contact detail (owner-scoped)",
    description:
      "Return the full detail of a contact request owned by the signed-in caller. If the id does not exist, or belongs to a different user, the answer is 404; the API never reveals whether the request exists for another owner."
  })
  @ApiErrors(404)
  @Respond({
    message: "contactAdmin:success.getMyContactDetail",
    type: ContactDetailItemDto
  })
  getMyContactDetail(
    @ValidParams(ContactIdParamsDto) params: ContactIdParamsDto
  ) {
    return this.service.getMyContactDetail(
      params.id,
      RequestContext.requireUserId()
    );
  }
}
