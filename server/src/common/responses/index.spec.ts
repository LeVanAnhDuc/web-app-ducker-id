// types
import type { Request, Response } from "express";
// common
import { STATUS_CODES } from "@/common/http";
import { NotFoundError } from "@/exceptions";
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
    })(createReq(t), res, jest.fn());

    expect(t).toHaveBeenCalledWith("user:success.getAdminUsers");
    expect(status).toHaveBeenCalledWith(STATUS_CODES.OK);
    expect(json.mock.calls[0][0]).toMatchObject({
      path: "/api/v1/admin/users",
      message: "translated user:success.getAdminUsers",
      data: [1]
    });
  });

  it("uses the status the route declares", async () => {
    const { res, status, json } = createRes();

    await handle(async () => ({ id: "a" }), {
      status: STATUS_CODES.CREATED,
      message: "favorite:success.add"
    })(
      createReq((key) => `T:${key}`),
      res,
      jest.fn()
    );

    expect(status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
    expect(json.mock.calls[0][0].message).toBe("T:favorite:success.add");
  });

  it("ends a 204 without a body", async () => {
    const { res, status, json, end } = createRes();

    await handle(async () => undefined, {
      status: STATUS_CODES.NO_CONTENT
    })(createReq(), res, jest.fn());

    expect(status).toHaveBeenCalledWith(STATUS_CODES.NO_CONTENT);
    expect(end).toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("sends an empty message when the route declares none", async () => {
    const t = jest.fn();
    const { res, json } = createRes();

    await handle(async () => 1)(createReq(t), res, jest.fn());

    expect(t).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].message).toBe("");
  });

  it("passes a thrown error to next instead of answering", async () => {
    const error = new NotFoundError();
    const next = jest.fn();
    const { res, status } = createRes();

    await handle(async () => {
      throw error;
    })(createReq(), res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(status).not.toHaveBeenCalled();
  });
});

describe("sendSuccess", () => {
  it("sends the message as given, untranslated", () => {
    const { res, json } = createRes();

    sendSuccess(createReq(), res, {
      status: STATUS_CODES.OK,
      message: "MongoDB is healthy"
    });

    expect(json.mock.calls[0][0].message).toBe("MongoDB is healthy");
  });
});
