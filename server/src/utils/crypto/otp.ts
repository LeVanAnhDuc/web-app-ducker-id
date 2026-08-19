// libs
import crypto from "crypto";

const RANDOM_BYTES_SIZE = 4;

export const generateOtp = (length: number): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  const randomBytes = crypto.randomBytes(RANDOM_BYTES_SIZE);
  const randomNumber = randomBytes.readUInt32BE(0);
  const otp = (randomNumber % (max - min + 1)) + min;

  return otp.toString();
};
