// libs
import { StatusCodes } from "http-status-codes";
import { JsonController, Post, Req } from "routing-controllers";
// types
import type { Request } from "express";
import type { ContactAdminService } from "./contact-admin.service";
// common
import { OptionalAuth, RateLimit, Respond, ValidBody } from "@/common/routing";
// others
import { SubmitContactBodyDto } from "./dtos/requests";

@JsonController("/contact")
export class ContactController {
  constructor(private readonly service: ContactAdminService) {}

  @Post("/submit")
  @RateLimit("contactByIp")
  @OptionalAuth()
  @Respond({
    status: StatusCodes.CREATED,
    message: "contactAdmin:success.submitted"
  })
  submit(
    @ValidBody(SubmitContactBodyDto) body: SubmitContactBodyDto,
    @Req() req: Request
  ) {
    return this.service.submitContact(body, req.ip ?? null);
  }
}
