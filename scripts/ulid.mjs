#!/usr/bin/env node
/**
 * Mint a ULID — the record identity every note and quiz block carries (ADR 0001).
 *
 * Record identity is minted by running this, never typed by hand: the authoring
 * skills shell out to it so that ULID generation lives in exactly one place in
 * the pipeline.
 *
 *   node scripts/ulid.mjs        # one ULID
 *   node scripts/ulid.mjs 5      # five
 */
import { randomFillSync } from "node:crypto"
import { pathToFileURL } from "node:url"

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

/** @param {number} [time] epoch millis; defaults to now */
export function ulid(time = Date.now()) {
  let timePart = ""
  let t = time
  for (let i = 0; i < 10; i++) {
    timePart = CROCKFORD[t % 32] + timePart
    t = Math.floor(t / 32)
  }

  const bytes = randomFillSync(new Uint8Array(16))
  let randomPart = ""
  for (let i = 0; i < 16; i++) {
    randomPart += CROCKFORD[bytes[i] % 32]
  }

  return timePart + randomPart
}

// `pathToFileURL`, not string concatenation: a repo path with a space or a non-ASCII
// character percent-encodes in `import.meta.url` but not in `argv[1]`, and the naive
// comparison would then quietly print nothing and exit 0 -- handing a skill an empty ULID.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raw = process.argv[2] ?? "1"
  const count = Number(raw)
  if (!Number.isInteger(count) || count < 1) {
    console.error(`ulid: expected a positive whole number of ULIDs, got "${raw}"`)
    process.exit(1)
  }
  for (let i = 0; i < count; i++) console.log(ulid())
}
