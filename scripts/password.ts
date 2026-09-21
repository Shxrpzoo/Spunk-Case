import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../server/security";
// A generated password avoids echoing a typed secret in a terminal.
const password = randomBytes(24).toString("base64url");
console.log("Save this admin password in your password manager:\n" + password);
console.log(
  "\nSet ADMIN_PASSWORD_HASH in Vercel to:\n" + (await hashPassword(password)),
);
void createInterface;
