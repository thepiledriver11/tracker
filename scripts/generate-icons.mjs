// Renders the app logo to the PNG sizes needed for iOS home screen and the
// PWA manifest. Run: node scripts/generate-icons.mjs
import sharp from "sharp";

// Full-bleed square: iOS and Android apply their own corner masks.
const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-dasharray="660 220" transform="rotate(-90 256 256)"/>
  <path d="M198 262l42 42 78-88" fill="none" stroke="#ffffff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const src = Buffer.from(art);

await sharp(src).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(src).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(src).resize(512, 512).png().toFile("public/icon-512.png");

console.log("icons generated");
