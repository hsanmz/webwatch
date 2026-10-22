/**
 * Regenerates the derived brand assets in /public from the two source files
 * that live in /public.
 *
 *   webwatch-logo.png    -> brand mark (arcs + white "W"), used for in-page logos
 *   webwatch-favicon.png -> app-icon badge (rounded square + dark green "W"),
 *                           used for every favicon-family output
 *
 * Outputs:
 *   public/logo.png              mark, trimmed to its content box (transparent)
 *   public/favicon.png           badge, 256x256 (transparent)
 *   public/favicon.ico           badge, 16/24/32/48/64/128/256 (PNG payloads)
 *   public/apple-touch-icon.png  badge on brand green, 180x180 (opaque)
 *   public/maskable-icon.png     badge on brand green, 512x512 (safe zone)
 *   public/og.png                1200x630 Open Graph card
 *
 * Usage: bun run scripts/generate-brand-assets.ts
 */
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");
const srcMark = join(publicDir, "webwatch-logo.png");
const srcBadge = join(publicDir, "webwatch-favicon.png");

const BRAND_DARK = "#043d32";
const BRAND_MID = "#0a3a2e";
const BRAND_GREEN = "#01a471";
const BRAND_MINT = "#7fd8b4";

/** Palette-quantised PNG. Keeps the files small enough to ship in /public. */
const PNG_OPTS = { palette: true, quality: 92, effort: 10, compressionLevel: 9 } as const;

type Trimmed = { data: Buffer; width: number; height: number };

/** Loads a source file and cuts away the fully transparent margins. */
async function trimmed(path: string, label: string): Promise<Trimmed> {
  const { data, info } = await sharp(path)
    .trim({ threshold: 10 })
    .toBuffer({ resolveWithObject: true });
  console.log(`  ${label}: ${info.width}x${info.height}`);
  return { data, width: info.width, height: info.height };
}

/** Scales artwork to fit inside a box, keeping its aspect ratio. */
function fit(src: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
  return sharp(src)
    .resize(Math.round(maxWidth), Math.round(maxHeight), {
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer();
}

/** Draws artwork centred on a transparent square canvas. */
async function onCanvas(
  src: Buffer,
  size: number,
  inner: number,
  background: { r: number; g: number; b: number; alpha: number },
): Promise<Buffer> {
  const scaled = await fit(src, inner, inner);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: scaled, gravity: "center" }])
    .png(PNG_OPTS)
    .toBuffer();
}

/** Packs PNG frames into a multi-resolution .ico container. */
function buildIco(frames: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  const entries = frames.map((frame) => {
    const entry = Buffer.alloc(16);
    const dim = frame.size >= 256 ? 0 : frame.size;
    entry.writeUInt8(dim, 0); // width (0 = 256)
    entry.writeUInt8(dim, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(frame.data.length, 8);
    return entry;
  });

  let offset = 6 + 16 * frames.length;
  frames.forEach((frame, i) => {
    entries[i].writeUInt32LE(offset, 12);
    offset += frame.data.length;
  });

  return Buffer.concat([header, ...entries, ...frames.map((frame) => frame.data)]);
}

async function write(name: string, data: Buffer): Promise<void> {
  await writeFile(join(publicDir, name), data);
  console.log(`  wrote ${name} (${(data.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log("Trimming sources...");
  const mark = await trimmed(srcMark, "mark");
  const badge = await trimmed(srcBadge, "badge");

  console.log("Building logo.png...");
  await write("logo.png", await sharp(mark.data).png(PNG_OPTS).toBuffer());

  console.log("Building favicon.png...");
  await write("favicon.png", await onCanvas(badge.data, 256, 235, { r: 0, g: 0, b: 0, alpha: 0 }));

  console.log("Building favicon.ico...");
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const frames = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      data: await sharp(badge.data)
        .resize(Math.round(size * 0.94), Math.round(size * 0.94), { fit: "inside" })
        .png(PNG_OPTS)
        .toBuffer(),
    })),
  );
  await write("favicon.ico", buildIco(frames));

  console.log("Building apple-touch-icon.png...");
  await write(
    "apple-touch-icon.png",
    await onCanvas(badge.data, 180, 124, { r: 4, g: 61, b: 50, alpha: 1 }),
  );

  console.log("Building maskable-icon.png...");
  // Android crops maskable icons to a circle inscribed in the middle 80%, so the
  // badge is kept well inside that safe zone.
  await write(
    "maskable-icon.png",
    await onCanvas(badge.data, 512, 300, { r: 4, g: 61, b: 50, alpha: 1 }),
  );

  console.log("Building og.png...");
  const badgePng = await fit(badge.data, 232, 232);
  const badgeDataUri = `data:image/png;base64,${badgePng.toString("base64")}`;
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND_DARK}"/>
      <stop offset="1" stop-color="${BRAND_MID}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g fill="none" stroke="${BRAND_GREEN}" stroke-opacity="0.07" stroke-width="2">
    <circle cx="980" cy="315" r="210"/>
    <circle cx="980" cy="315" r="305"/>
    <circle cx="980" cy="315" r="400"/>
    <circle cx="980" cy="315" r="495"/>
    <circle cx="980" cy="315" r="590"/>
  </g>
  <image x="100" y="199" width="232" height="232" href="${badgeDataUri}"/>
  <text x="380" y="294" font-family="Noto Sans, Liberation Sans, DejaVu Sans, sans-serif" font-weight="700" font-size="70" letter-spacing="1" fill="#ffffff">WEBWATCH</text>
  <rect x="380" y="320" width="92" height="4" fill="${BRAND_MINT}"/>
  <text x="380" y="368" font-family="Noto Sans, Liberation Sans, DejaVu Sans, sans-serif" font-weight="400" font-size="30" fill="${BRAND_MINT}">Uptime monitor with instant Telegram alerts</text>
</svg>`;
  await write("og.png", await sharp(Buffer.from(ogSvg)).png(PNG_OPTS).toBuffer());

  console.log("Done.");
}

await main();
