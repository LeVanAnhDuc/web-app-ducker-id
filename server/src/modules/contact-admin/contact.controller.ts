// libs
import { StatusCodes } from "http-status-codes";
import { JsonController, Post, Req } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Request } from "express";
import type { ContactAdminService } from "./services";
// common
import { OptionalAuth, RateLimit, Respond, ValidBody } from "@/common/routing";
// others
import { SubmitContactResponseDto } from "./dtos";
import { SubmitContactBodyDto } from "./dtos/requests";

@JsonController("/contact")
@OpenAPI({ tags: ["Contact Admin"] })
export class ContactController {
  constructor(private readonly service: ContactAdminService) {}

  @Post("/submit")
  @OpenAPI({
    summary: "Submit a contact request",
    description:
      "Submit a contact request to the admin.\n\nWith a valid Bearer token the contact is attached to the caller (`userId`) so it later shows up in `GET /contacts`. Guests may still submit; the contact is created with `userId = null`."
  })
  @RateLimit("contactByIp")
  @OptionalAuth()
  @Respond({
    status: StatusCodes.CREATED,
    message: "contactAdmin:success.submitted",
    type: SubmitContactResponseDto
  })
  submit(
    @ValidBody(SubmitContactBodyDto) body: SubmitContactBodyDto,
    @Req() req: Request
  ) {
    return this.service.submitContact(body, req.ip ?? null);
  }
}
