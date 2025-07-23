"use strict";

import crypto from "crypto";
import hibase32 from "hi-base32";

function generate(secret, nowtime) {
  const timestep = 30;
  const digits = 6;

  const key = hibase32.decode(secret, true);

  const counter = Math.floor(nowtime / 1000 / timestep);

  const counter_bytes = Buffer.alloc(8);
  counter_bytes.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto
    .createHmac("sha1", Buffer.from(key))
    .update(counter_bytes)
    .digest();

  const offset = hmac[hmac.length - 1] & 0x0f;

  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (bin % Math.pow(10, digits)).toString().padStart(digits, "0");
}

export default generate;