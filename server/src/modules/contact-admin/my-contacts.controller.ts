// libs
import { Get, JsonController } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { ContactAdminService } from "./services";
// common
import { ApiErrors, ApiProperty, Paginated } from "@/common/openapi";
import { Auth, PathVariable, RequestParam, Respond } from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { RequestContext } from "@/utils/request-context";
import { ContactDetailItemDto, ContactListItemDto } from "./dtos";
import { MyContactsQueryDto } from "./dtos/requests";

// Every failure takes the one key; each keeps its own constraint name so
// `reason` still tells them apart.
const CONTACT_ID = [
  IsRequiredObjectId("contactAdmin:errors.invalidId"),
  ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the contact request"
  })
];

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
  getMyContacts(@RequestParam(MyContactsQueryDto) query: MyContactsQueryDto) {
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
  getMyContactDetail(@PathVariable("id", ...CONTACT_ID) id: string) {
    return this.service.getMyContactDetail(id, RequestContext.requireUserId());
  }
}
