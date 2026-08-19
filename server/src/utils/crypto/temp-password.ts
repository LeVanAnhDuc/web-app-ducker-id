// libs
import crypto from "crypto";

const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const NUMBER_CHARS = "0123456789";
const SPECIAL_CHARS = "!@#$%^&*";
const ALL_CHARS =
  UPPERCASE_CHARS + LOWERCASE_CHARS + NUMBER_CHARS + SPECIAL_CHARS;

const getRandomChar = (chars: string): string => {
  const randomIndex = crypto.randomBytes(1).readUInt8(0) % chars.length;
  return chars[randomIndex];
};

const shuffleString = (str: string): string => {
  const chars = str.split("");

  for (let i = chars.length - 1; i > 0; i--) {
    const randomIndex = crypto.randomBytes(1).readUInt8(0) % (i + 1);
    [chars[i], chars[randomIndex]] = [chars[randomIndex], chars[i]];
  }

  return chars.join("");
};

export const generateTempPassword = (length: number = 16): string => {
  const passwordChars: string[] = [
    getRandomChar(UPPERCASE_CHARS),
    getRandomChar(LOWERCASE_CHARS),
    getRandomChar(NUMBER_CHARS),
    getRandomChar(SPECIAL_CHARS)
  ];

  const remainingLength = length - 4;
  for (let i = 0; i < remainingLength; i++) {
    passwordChars.push(getRandomChar(ALL_CHARS));
  }

  return shuffleString(passwordChars.join(""));
};
