// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { composeDecorators, IsObjectId } from "@/validators/decorators";

// Joi gave every failure of an id the same key; each still keeps its own
// constraint name so `reason` tells them apart.
export const IsUserId = (): PropertyDecorator =>
  composeDecorators(
    IsObjectId("user:errors.invalidId"),
    IsNotEmpty({ message: "user:errors.invalidId" }),
    IsString({ message: "user:errors.invalidId" }),
    IsDefined({ message: "user:errors.invalidId" })
  );
