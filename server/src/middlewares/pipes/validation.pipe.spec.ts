// libs
import { IsDefined, IsString, MaxLength } from "class-validator";
// types
import type { NextFunction, Response } from "express";
// common
import { ValidationError } from "@/exceptions";
// others
import { bodyPipe, queryPipe } from "@/middlewares/pipes/validation.pipe";
import { makeMockRequest } from "@test/helpers/request.helper";

class FixtureDto {
  @IsDefined({ message: "validation:a.required" })
  @IsString({ message: "validation:a.invalid" })
  @MaxLength(2, { message: "validation:a.max" })
  a!: string;
}

const translate = (key: string): string => `t(${key})`;
const res = {} as Response;

const firstError = (next: jest.Mock): ValidationError => {
  expect(next).toHaveBeenCalledTimes(1);
  const [error] = next.mock.calls[0];
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
};

describe("validation pipe", () => {
  it("DTO path translates keys", async () => {
    const req = makeMockRequest({ body: { a: "abcd" }, t: translate });
    const next = jest.fn();

    await bodyPipe(FixtureDto)(req, res, next as NextFunction);

    const [item] = firstError(next).errors;
    expect(item.message).toBe("t(validation:a.max)");
    expect(item.reason).toBe("maxLength");
  });

  it("DTO path replaces req.query even when it is a getter", async () => {
    const req = makeMockRequest({ t: translate });
    Object.defineProperty(req, "query", {
      get: () => ({ a: "x", extra: "1" }),
      configurable: true
    });
    const next = jest.fn();

    await queryPipe(FixtureDto)(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect({ ...req.query }).toEqual({ a: "x" });
  });

  it("missing body is validated as {}", async () => {
    const req = makeMockRequest({ t: translate });
    req.body = undefined;
    const next = jest.fn();

    await bodyPipe(FixtureDto)(req, res, next as NextFunction);

    expect(firstError(next).errors).toEqual([
      { field: "a", reason: "isDefined", message: "t(validation:a.required)" }
    ]);
  });
});
