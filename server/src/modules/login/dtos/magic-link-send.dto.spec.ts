// others
import { toMagicLinkSendDto } from "./magic-link-send.dto";

describe("toMagicLinkSendDto", () => {
  it("returns MagicLinkSendDto with success=true and both durations", () => {
    const result = toMagicLinkSendDto(900, 60);

    expect(result).toEqual({
      success: true,
      expiresIn: 900,
      cooldown: 60
    });
  });

  it("preserves zero values without defaulting", () => {
    const result = toMagicLinkSendDto(0, 0);

    expect(result).toEqual({
      success: true,
      expiresIn: 0,
      cooldown: 0
    });
  });
});
