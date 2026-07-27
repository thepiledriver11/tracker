// Rasterise the app icon to the sizes iOS + the manifest need.
// Run locally with `npm run icons`; the PNGs are committed to public/icons.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "icons");

// The descending-ladder motif on a jade field: three rounded rungs stepping
// down and to the right, widths 100/78/58%, echoing the app's signature.
function svg(size: number, pad: number): string {
  const bg = size;
  const inner = size - pad * 2;
  const rungH = inner * 0.15;
  const gap = inner * 0.075;
  const x0 = pad;
  const y0 = pad + inner * 0.14;
  const widths = [1.0, 0.78, 0.58];
  const rungs = widths
    .map((w, i) => {
      const y = y0 + i * (rungH + gap);
      const rw = inner * w;
      return `<rect x="${x0}" y="${y.toFixed(1)}" width="${rw.toFixed(
        1,
      )}" height="${rungH.toFixed(1)}" rx="${(rungH / 2).toFixed(
        1,
      )}" fill="rgba(255,255,255,${0.95 - i * 0.18})"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bg}" height="${bg}" viewBox="0 0 ${bg} ${bg}">
    <defs>
      <linearGradient id="j" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#43DFA2"/>
        <stop offset="100%" stop-color="#17BA84"/>
      </linearGradient>
    </defs>
    <rect width="${bg}" height="${bg}" rx="${(bg * 0.22).toFixed(0)}" fill="url(#j)"/>
    ${rungs}
  </svg>`;
}

async function render(name: string, size: number, maskable = false) {
  // Maskable icons need content inside the safe zone (~80%).
  const pad = maskable ? size * 0.16 : size * 0.14;
  const buf = Buffer.from(svg(size, pad));
  await sharp(buf).png().toFile(join(OUT, name));
  console.log("wrote", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await render("icon-192.png", 192);
  await render("icon-512.png", 512);
  await render("icon-512-maskable.png", 512, true);
  await render("apple-touch-icon.png", 180);
  await render("favicon.png", 64);
}

main();
