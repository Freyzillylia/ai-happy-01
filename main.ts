import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Entry: built a second swing so you never swing alone in the afternoon (love, mila 6)
const SPEC = Object.freeze({
  asset: "mila-backyard-twin-swing-judge.jpg",
  bytes: 303372,
  sha256: "be4ef33bc2046a9cc5767447f98071e4d0afc87a564c58ea4b620fb023709486",
  label: "freyzillylia",
});

function parseDimensions(b: Buffer): [number, number] {
  let idx = 2;
  while (idx + 4 <= b.length) {
    if (b[idx] !== 0xff) break;
    while (idx < b.length && b[idx] === 0xff) idx++;
    const m = b[idx++];
    if (m === 0xd9 || (m >= 0xd0 && m <= 0xd7)) continue;
    const len = b.readUInt16BE(idx);
    if (m === 0xc0 || m === 0xc2) {
      return [b.readUInt16BE(idx + 5), b.readUInt16BE(idx + 3)];
    }
    idx += len;
  }
  throw new Error("Unable to read JPEG dimensions");
}

function runPublish(): void {
  const selfDir = dirname(fileURLToPath(import.meta.url));
  const candidateList = [resolve(selfDir, SPEC.asset), resolve("/bot", SPEC.asset)];
  const assetPath = candidateList.find((p) => existsSync(p));
  if (!assetPath) throw new Error(`Asset not found: ${SPEC.asset}`);

  const buf = readFileSync(assetPath);
  if (buf.length !== SPEC.bytes || buf.length > 1048576) {
    throw new Error(`Length check failed: ${buf.length}`);
  }
  const [w, h] = parseDimensions(buf);
  if (w !== 1024 || h !== 1024) throw new Error(`Unexpected bounds: ${w}x${h}`);

  const hex = createHash("sha256").update(buf).digest("hex");
  if (hex !== SPEC.sha256) throw new Error(`Checksum failed: ${hex}`);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "entry.png"), buf);
}

runPublish();
