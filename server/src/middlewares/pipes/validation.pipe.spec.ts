// libs
import express from "express";
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from "class-validator";
// types
import type { Server } from "http";
import type { AddressInfo } from "net";
import type {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Response
} from "express";
// common
import { AppError, ValidationError } from "@/exceptions";
// validators
import { IsAppEmail, IsRequiredObjectId, ToInt } from "@/validators/decorators";
// others
import { bodyPipe, paramsPipe, queryPipe } from "./validation.pipe";
import { makeMockRequest } from "@test/helpers/request.helper";

class FixtureDto {
  @IsDefined({ message: "validation:a.required" })
  @IsString({ message: "validation:a.invalid" })
  @MaxLength(2, { message: "validation:a.max" })
  a!: string;
}

const translate = (key: string): string => `t(${key})`;
const res = {} as Response;

const rejection = async (run: Promise<void>): Promise<ValidationError> => {
  const error: unknown = await run.then(
    () => undefined,
    (err: unknown) => err
  );
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
};

describe("validation pipe", () => {
  it("translates each failure key", async () => {
    const req = makeMockRequest({ body: { a: "abcd" }, t: translate });
    const next = jest.fn();

    const error = await rejection(
      bodyPipe(FixtureDto)(req, res, next as NextFunction)
    );

    const [item] = error.errors;
    expect(item.message).toBe("t(validation:a.max)");
    expect(item.reason).toBe("maxLength");
    expect(next).not.toHaveBeenCalled();
  });

  it("replaces req.query even when it is a getter", async () => {
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

  it("validates a missing body as {}", async () => {
    const req = makeMockRequest({ t: translate });
    req.body = undefined;
    const next = jest.fn();

    const error = await rejection(
      bodyPipe(FixtureDto)(req, res, next as NextFunction)
    );

    expect(error.errors).toEqual([
      { field: "a", reason: "isDefined", message: "t(validation:a.required)" }
    ]);
  });

  it("refuses a top-level array body and leaves req.body alone", async () => {
    const body = [{ a: "x" }];
    const req = makeMockRequest({ body, t: translate });
    const next = jest.fn();

    const error = await rejection(
      bodyPipe(FixtureDto)(req, res, next as NextFunction)
    );

    expect(error.errors).toEqual([
      { field: "", reason: "isObject", message: "t(validation:body.invalid)" }
    ]);
    expect(req.body).toBe(body);
    expect(next).not.toHaveBeenCalled();
  });
});

// Runs the pipes inside a real Express app, because what they depend on —
// whether req.query can be replaced, what req.body is when no body was sent,
// whether a rejected middleware reaches the error handler — is Express
// behaviour that a hand-built req object would only imitate.

class PageQueryDto {
  @IsOptional()
  @Min(1, { message: "validation:page.min" })
  @IsInt({ message: "validation:page.int" })
  @ToInt()
  page?: number;
}

class EmailBodyDto {
  @IsAppEmail()
  email!: string;
}

class IdParamsDto {
  @IsRequiredObjectId("validation:id.invalid")
  id!: string;
}

const reportErrors: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, errors: err.errors });
    return;
  }
  res.status(500).json({ code: "UNEXPECTED", message: String(err) });
};

const listen = (app: Express): Promise<{ server: Server; url: string }> =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });

describe("validation pipes in a real Express app", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // Stand-in for the i18n middleware: the pipe translates failure keys.
    app.use((req, _res, next) => {
      req.t = ((key: string) => key) as typeof req.t;
      next();
    });

    app.get("/query", queryPipe(PageQueryDto), (req, res) => {
      res.json(req.query);
    });

    app.get("/items/:id", paramsPipe(IdParamsDto), (req, res) => {
      res.json(req.params);
    });

    app.post("/body", bodyPipe(EmailBodyDto), (req, res) => {
      res.json({ email: req.body.email });
    });

    app.use(reportErrors);
    ({ server, url } = await listen(app));
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("replaces req.query with the validated, converted and stripped value", async () => {
    const res = await fetch(`${url}/query?page=2&junk=1`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ page: 2 });
  });

  it("rejects an invalid query with a validation error", async () => {
    const res = await fetch(`${url}/query?page=0`);

    expect(res.status).toBe(400);
  });

  it("rejects a request that sends no body at all", async () => {
    const res = await fetch(`${url}/body`, { method: "POST" });

    expect(res.status).toBe(400);
  });

  it("passes a valid body through", async () => {
    const res = await fetch(`${url}/body`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.co", extra: true })
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "a@b.co" });
  });

  it("passes valid route params through", async () => {
    const id = "a".repeat(24);
    const res = await fetch(`${url}/items/${id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id });
  });

  it("rejects invalid route params with the param's key", async () => {
    const res = await fetch(`${url}/items/not-an-id`);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      code: "VALIDATION_ERROR",
      errors: [
        {
          field: "id",
          reason: "isObjectId",
          message: "validation:id.invalid"
        }
      ]
    });
  });
});
