import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;

/** A real cost-12 hash of a random string, compared against when an email is unknown. */
const DUMMY_HASH = "$2b$12$fGBphZr4.KvnXhJ.LPk3Geee8WGtRsHroMk.sW6ECsRAjblOPIfEm";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/** Always runs a full bcrypt comparison, so unknown emails take as long as wrong passwords. */
export function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH).then((match) => match && hash !== null);
}
