// libs
import express from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { Server } from "http";
import type { AddressInfo } from "net";
import type { ErrorRequestHandler, Request, Response } from "express";
// common
import { AppError, NotFoundError } from "@/exceptions";
// others
import { handle, sendSuccess } from "./index";

const createRes = () => {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn().mockReturnValue({ json, end });
  return { res: { status } as unknown as Response, status, json, end };
};

const createReq = (t?: (key: string) => string) =>
  ({ originalUrl: "/api/v1/admin/users", t }) as unknown as Request;

describe("handle", () => {
  it("answers 200 by default with the handler's data and the translated message", async () => {
    const t = jest.fn((key: string) => `translated ${key}`);
    const { res, status, json } = createRes();

    await handle(async () => [1], {
      message: "user:success.getAdminUsers"
    })(createReq(t), res);

    expect(t).toHaveBeenCalledWith("user:success.getAdminUsers");
    expect(status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(json.mock.calls[0][0]).toMatchObject({
      path: "/api/v1/admin/users",
      message: "translated user:success.getAdminUsers",
      data: [1]
    });
  });

  it("uses the status the route declares", async () => {
    const { res, status, json } = createRes();

    await handle(async () => ({ id: "a" }), {
      status: StatusCodes.CREATED,
      message: "favorite:success.add"
    })(
      createReq((key) => `T:${key}`),
      res
    );

    expect(status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(json.mock.calls[0][0].message).toBe("T:favorite:success.add");
  });

  it("ends a 204 without a body", async () => {
    const { res, status, json, end } = createRes();

    await handle(async () => undefined, {
      status: StatusCodes.NO_CONTENT
    })(createReq(), res);

    expect(status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
    expect(end).toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("sends an empty message when the route declares none", async () => {
    const t = jest.fn();
    const { res, json } = createRes();

    await handle(async () => 1)(createReq(t), res);

    expect(t).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].message).toBe("");
  });

  it("rejects with a thrown error instead of answering", async () => {
    // Express 5 forwards the rejection to the error filter itself.
    const error = new NotFoundError();
    const { res, status } = createRes();

    await expect(
      handle(async () => {
        throw error;
      })(createReq(), res)
    ).rejects.toBe(error);

    expect(status).not.toHaveBeenCalled();
  });

  it("reaches the error handler of a real Express app", async () => {
    const app = express();
    app.get(
      "/missing",
      handle(async () => {
        throw new NotFoundError();
      })
    );
    const reportErrors: ErrorRequestHandler = (err, _req, res, _next) => {
      res.status(err instanceof AppError ? err.status : 500).end();
    };
    app.use(reportErrors);

    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/missing`);
      expect(res.status).toBe(404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe("sendSuccess", () => {
  it("sends the message as given, untranslated", () => {
    const { res, json } = createRes();

    sendSuccess(createReq(), res, {
      status: StatusCodes.OK,
      message: "MongoDB is healthy"
    });

    expect(json.mock.calls[0][0].message).toBe("MongoDB is healthy");
  });
});
