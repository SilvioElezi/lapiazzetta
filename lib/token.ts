import crypto from "crypto";

export function generateConfirmToken() {
  return crypto.randomBytes(32).toString("hex");
}
