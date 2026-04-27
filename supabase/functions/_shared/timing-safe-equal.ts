// Constant-time string comparison to prevent timing attacks on shared secrets
// (e.g. CRON_SECRET). Returns false immediately on length mismatch (length is
// not secret), then XORs every byte before returning the accumulated diff.
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
