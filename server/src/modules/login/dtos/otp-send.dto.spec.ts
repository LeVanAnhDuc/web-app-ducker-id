// others
import { toOtpSendDto } from "./otp-send.dto";

describe("toOtpSendDto", () => {
  it("returns OtpSendDto with success=true and both durations", () => {
    const result = toOtpSendDto(300, 60);

    expect(result).toEqual({
      success: true,
      expiresIn: 300,
      cooldown: 60
    });
  });

  it("preserves zero values without defaulting", () => {
    const result = toOtpSendDto(0, 0);

    expect(result).toEqual({
      success: true,
      expiresIn: 0,
      cooldown: 0
    });
  });
});
