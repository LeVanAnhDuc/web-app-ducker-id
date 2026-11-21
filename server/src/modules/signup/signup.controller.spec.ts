// types
import type { Response } from "express";
import type { SignupService } from "./services";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { CompleteSignupBodyDto } from "./dtos/requests";
import { SignupController } from "./signup.controller";

const createResponseMock = () => {
  const res = { status: jest.fn(), json: jest.fn(), cookie: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  return res;
};

describe("SignupController.completeSignup", () => {
  it("sets the refresh cookie like login and keeps the token out of the body (BUG-AUTH-02)", async () => {
    const service = {
      completeSignup: jest.fn().mockResolvedValue({
        success: true,
        user: { id: "u1", email: "new@example.com", fullName: "New User" },
        tokens: {
          accessToken: "access-x",
          refreshToken: "refresh-x",
          idToken: "id-x",
          expiresIn: 3600
        }
      })
    } as unknown as jest.Mocked<SignupService>;
    const controller = new SignupController(service);
    const res = createResponseMock();

    const data = await controller.completeSignup(
      new CompleteSignupBodyDto(),
      res as unknown as Response
    );

    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN,
      "refresh-x",
      REFRESH_TOKEN_COOKIE_OPTIONS
    );
    expect(data.tokens).toEqual({
      accessToken: "access-x",
      idToken: "id-x",
      expiresIn: 3600
    });
    expect(data.user).toEqual({
      id: "u1",
      email: "new@example.com",
      fullName: "New User"
    });
  });
});
