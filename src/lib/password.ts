import crypto from "crypto";

/**
 * Password hashing.
 *
 * Replaces the original single-round `sha256(password + "::" + staticSalt)`,
 * which was trivially brute-forceable because the salt was committed to the
 * repository. This uses Node's built-in scrypt with a per-password random salt.
 *
 * Stored format:  scrypt$N$r$p$<saltHex>$<hashHex>
 */

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function hashPassword(password: string): string {
  const { N, r, p, keylen } = SCRYPT_PARAMS;
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize("NFKC"), salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  // Legacy hashes written by the old auth scheme: sha256 of `password::salt`.
  if (!stored.startsWith("scrypt$")) {
    const legacySalt = process.env.LEGACY_PASSWORD_SALT ?? "mihad-boom-shorts-secure-salt-v1";
    const legacy = crypto
      .createHash("sha256")
      .update(`${password}::${legacySalt}`)
      .digest("hex");
    return safeEqual(legacy, stored);
  }

  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;

  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = crypto.scryptSync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length, {
      N,
      r,
      p,
    });
  } catch {
    return false;
  }
  return safeEqual(derived.toString("hex"), expected.toString("hex"));
}

/** True when a stored hash uses the old, weak scheme and should be rehashed. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith("scrypt$");
}

/** Constant-time string comparison that never throws on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still run a comparison so the timing does not reveal the length mismatch.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Minimum acceptable password length for admin accounts. */
export const MIN_PASSWORD_LENGTH = 8;

export function passwordProblem(password: string): string | null {
  const p = password.trim();
  if (p.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}
