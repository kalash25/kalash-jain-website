// Renders the share image (public/og-v2.jpg, 2400×1260: a 1200×630 card at 2x) used by LinkedIn, Slack, iMessage, etc.
// Run with: npm run og   (macOS, needs Google Chrome installed)
//
// It builds a small HTML card with the site's own fonts, colours and portrait,
// screenshots it with headless Chrome, then compresses it to a JPEG with sharp.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1200;
const H = 630;

const b64 = (p) => readFileSync(p).toString('base64');
const display = b64('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2');
const body = b64('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');
const mono = b64('node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2');
const photo = (await sharp('src/assets/portrait-dark.webp').jpeg({ quality: 95 }).toBuffer()).toString('base64');

// Same waveform shape as the hero, frozen at a nice moment
let wave = '';
for (let i = 0; i <= 160; i++) {
  const x = i / 160;
  const env = Math.pow(Math.sin(Math.PI * x), 1.4);
  const s = Math.sin(x * 38 + 1.2) * 0.5 + Math.sin(x * 91 - 0.7) * 0.3 + Math.sin(x * 17 + 2) * 0.2;
  wave += `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(30 - s * env * 22).toFixed(1)}`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: D; src: url(data:font/woff2;base64,${display}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: B; src: url(data:font/woff2;base64,${body}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: M; src: url(data:font/woff2;base64,${mono}) format('woff2'); font-weight: 100 900; }
:root { --bg: oklch(0.145 0.012 285); --ink: oklch(0.97 0.006 285); --muted: oklch(0.72 0.022 285);
  --accent: oklch(0.72 0.16 285); }
* { margin: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { background: var(--bg); color: var(--ink); font-family: B; position: relative; }
.glow { position: absolute; width: 900px; height: 900px; left: 420px; top: -150px;
  background: radial-gradient(closest-side, oklch(0.52 0.24 285 / 0.42), transparent 70%); }
.copy { position: absolute; left: 76px; top: 70px; width: 640px; }
.eyebrow { font-family: M; font-weight: 500; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.eyebrow b { color: var(--accent); font-weight: 400; }
h1 { font-family: D; font-weight: 700; font-variation-settings: 'opsz' 96; font-size: 118px;
  line-height: 0.95; letter-spacing: -0.045em; margin-top: 22px; }
svg { display: block; width: 520px; height: 60px; margin: 10px 0 26px; }
svg path { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.line { font-family: D; font-weight: 500; font-variation-settings: 'opsz' 48; font-size: 44px;
  line-height: 1.12; letter-spacing: -0.025em; }
.line em { font-style: normal; color: var(--accent); }
.status { position: absolute; left: 76px; bottom: 58px; display: flex; align-items: center; gap: 14px;
  font-family: M; font-weight: 500; font-size: 21px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.dot { width: 11px; height: 11px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 0 6px oklch(0.72 0.16 285 / 0.22); }
.url { position: absolute; right: 76px; bottom: 58px; width: 392px; text-align: center;
  font-family: M; font-weight: 500; font-size: 22px; letter-spacing: 0.04em; color: var(--ink); }
.photo { position: absolute; right: 76px; top: 56px; width: 392px; height: 466px; border-radius: 28px;
  overflow: hidden; box-shadow: 0 40px 80px -30px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(1 0 0 / 0.08); }
.photo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 28%; display: block; }
</style></head><body>
<div class="glow"></div>
<div class="copy">
  <p class="eyebrow">UCLA Anderson MBA '28 <b>·</b> ex-JPMorgan Chase</p>
  <h1>Kalash Jain</h1>
  <svg viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="${wave}"/></svg>
  <p class="line">Product thinker<br><em>with an engineer's toolkit.</em></p>
</div>
<p class="status"><span class="dot"></span>Recruiting for Summer '27 PM internships</p>
<p class="url">kalash-jain.com</p>
<div class="photo"><img src="data:image/jpeg;base64,${photo}" alt=""></div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'og-'));
const page = join(dir, 'card.html');
const shot = join(dir, 'card.png');
writeFileSync(page, html);
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2', // render at 2x so it stays sharp after LinkedIn rescales it
  `--window-size=${W},${H}`,
  '--virtual-time-budget=3000',
  `--screenshot=${shot}`,
  `file://${page}`,
], { stdio: 'ignore' });

// 4:4:4 chroma keeps coloured text crisp (JPEG's default halves colour resolution)
await sharp(shot)
  .resize(W * 2, H * 2)
  .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile('public/og-v2.jpg');
rmSync(dir, { recursive: true, force: true });
console.log('Wrote public/og-v2.jpg (2400×1260)');
