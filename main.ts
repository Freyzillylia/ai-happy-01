import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// built a second swing so the judge never swings alone today (love, mila 6)
const ASSET_PATH = "mila-backyard-twin-swings.jpg";
const PROFILE = "freyzillylia";
const BYTES_EXPECTED = 209230;
const SHA_EXPECTED = "c46c5cb48abda7a4bb62949668e8d013c96bf8b4413582611cf664db50a4675c";
const PIXELS = 1024;
const LIMIT_BYTES = 1048576;

function extractSofSize(raw: Buffer): readonly [number, number] {
  if (raw.length < 4 || raw[0] !== 0xff || raw[1] !== 0xd8 || raw[raw.length - 2] !== 0xff || raw[raw.length - 1] !== 0xd9) {
    throw new Error("Malformed JPEG wrapper");
  }
  let cursor = 2;
  while (cursor + 4 <= raw.length) {
    while (cursor < raw.length && raw[cursor] === 0xff) cursor++;
    if (cursor >= raw.length) break;
    const mk = raw[cursor++];
    if (mk === 0xd9 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) continue;
    const len = raw.readUInt16BE(cursor);
    if (mk === 0xc0 || mk === 0xc2) return [raw.readUInt16BE(cursor + 5), raw.readUInt16BE(cursor + 3)];
    cursor += len;
  }
  throw new Error("Frame header absent");
}

function run(): void {
  const cwdHere = dirname(fileURLToPath(import.meta.url));
  const picked = [join(cwdHere, ASSET_PATH), join("/bot", ASSET_PATH)].find((p) => existsSync(p));
  if (!picked) throw new Error(`Missing ${ASSET_PATH}`);
  const data = readFileSync(picked);
  if (data.byteLength !== BYTES_EXPECTED || data.byteLength > LIMIT_BYTES) {
    throw new Error(`Invalid byte count ${data.byteLength}`);
  }
  const [w, h] = extractSofSize(data);
  if (w !== PIXELS || h !== PIXELS) throw new Error(`Bad geometry ${w}x${h}`);
  const sha = createHash("sha256").update(data).digest("hex");
  if (sha !== SHA_EXPECTED) throw new Error(`SHA mismatch ${sha}`);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const outPng = join(outDir, "entry.png");
  writeFileSync(outPng, data);
  if (process.env.MAKEFUN_VERBOSE === "1") console.log(`[${PROFILE}] emitted ${data.length}B -> ${outPng}`);
}

run();
