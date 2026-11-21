// libs
import { StatusCodes } from "http-status-codes";
// types
import type { Request, Response } from "express";
// others
import { sendSuccess } from "./index";

const createRes = () => {
  const json = jest.fn();
  const end = jest.fn();
  const status = jest.fn().mockReturnValue({ json, end });
  return { res: { status } as unknown as Response, status, json, end };
};

const createReq = (t?: (key: string) => string) =>
  ({ originalUrl: "/api/v1/admin/users", t }) as unknown as Request;

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
