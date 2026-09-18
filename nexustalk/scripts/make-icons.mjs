// One-time generator: renders the app icon to PNG sizes for the PWA manifest.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(root, '..', 'public', 'icon.svg'));

await sharp(svg).resize(192, 192).png().toFile(path.join(root, '..', 'public', 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(path.join(root, '..', 'public', 'icon-512.png'));

// Maskable icon: the logo on a full-bleed gradient (safe zone padding)
const maskable = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="45%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="256" y="330" font-family="Arial, Helvetica, sans-serif" font-size="220" font-weight="800" fill="#ffffff" text-anchor="middle">N</text>
</svg>`;
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile(path.join(root, '..', 'public', 'icon-maskable-512.png'));

console.log('icons generated: icon-192.png, icon-512.png, icon-maskable-512.png');
