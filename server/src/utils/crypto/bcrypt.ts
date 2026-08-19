// libs
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export const hashValue = (value: string): string =>
  bcrypt.hashSync(value, SALT_ROUNDS);

export const isValidHashedValue = (value: string, hashValue: string): boolean =>
  bcrypt.compareSync(value, hashValue);
