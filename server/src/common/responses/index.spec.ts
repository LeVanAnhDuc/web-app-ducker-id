// types
import type { Response } from "express";
// others
import { CreatedSuccess, OkSuccess } from "./index";

const respond = (
  success: OkSuccess<unknown> | CreatedSuccess<unknown>,
  t?: (key: string) => string
) => {
  const json = jest.fn();
  const res = { status: jest.fn().mockReturnValue({ json }) };
  success.send(
    { originalUrl: "/api/v1/admin/users", t } as never,
    res as unknown as Response
  );
  return { status: res.status.mock.calls[0][0], body: json.mock.calls[0][0] };
};

describe("SuccessResponse.send", () => {
  it("translates the message key for the request", () => {
    const t = jest.fn((key: string) => `translated ${key}`);
    const { status, body } = respond(
      new OkSuccess({ data: [1], message: "user:success.getAdminUsers" }),
      t
    );

    expect(t).toHaveBeenCalledWith("user:success.getAdminUsers");
    expect(status).toBe(200);
    expect(body).toMatchObject({
      path: "/api/v1/admin/users",
      message: "translated user:success.getAdminUsers",
      data: [1]
    });
  });

  it("translates a created response too", () => {
    const { status, body } = respond(
      new CreatedSuccess({ message: "favorite:success.add" }),
      (key) => `T:${key}`
    );

    expect(status).toBe(201);
    expect(body.message).toBe("T:favorite:success.add");
  });

  it("leaves the message alone when the request has no translator", () => {
    const { body } = respond(new OkSuccess({ message: "MongoDB is healthy" }));

    expect(body.message).toBe("MongoDB is healthy");
  });

  it("does not translate an empty message", () => {
    const t = jest.fn();
    const { body } = respond(new OkSuccess({ data: 1 }), t);

    expect(t).not.toHaveBeenCalled();
    expect(body.message).toBe("");
  });
});
