import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
// The tutor-requested default login. Only its salted derived hash is stored.
// Apply this revision once; subsequent PIN changes in Settings stay intact.
export const defaultTutorLogin = {
  salt: "78f06c760687a84f09b04dd7827820ad",
  pinHash: "e5179bafaba2b8e215c1f5de82a4a5eb490c2e9c8fe59b6bcddcb6e89a7619d0",
  tutorCredentialRevision: 1,
};
export function salt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function hashPin(pin: string, salt: string) {
  await new Promise((r) => setTimeout(r, 0));
  return Array.from(pbkdf2(sha256, pin, salt, { c: 120000, dkLen: 32 }), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export const validPin = (pin: string) => /^\d{4,6}$/.test(pin);
