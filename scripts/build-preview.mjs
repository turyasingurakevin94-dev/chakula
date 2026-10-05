// Builds a single self-contained HTML file of the web version of the app, so it can be
// previewed in a browser or on a phone without running a dev server.
//
//   node scripts/build-preview.mjs            -> dist-preview/chakula-preview.html
//
// The export's JS bundle and every asset it references (fonts, images) are inlined as
// data URIs, because the preview host only serves one page.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const exportDir = join(root, '.preview-build');
const outDir = join(root, 'dist-preview');
const outFile = join(outDir, 'chakula-preview.html');

rmSync(exportDir, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir ${exportDir}`, {
  cwd: root,
  stdio: 'inherit',
  // EXPO_OFFLINE skips the Expo API version check, which some networks block.
  env: { ...process.env, CI: '1', EXPO_OFFLINE: '1' },
});

const html = readFileSync(join(exportDir, 'index.html'), 'utf8');
const scriptSrc = html.match(/<script src="([^"]+)"/)?.[1];
if (!scriptSrc) throw new Error('No script tag found in the web export');
let js = readFileSync(join(exportDir, scriptSrc), 'utf8');

const mime = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
let inlined = 0;
js = js.replace(/"(\/assets\/[^"]+)"/g, (match, path) => {
  const file = join(exportDir, path);
  const type = mime[extname(path).toLowerCase()];
  if (!type || !existsSync(file)) return match;
  inlined++;
  return `"data:${type};base64,${readFileSync(file).toString('base64')}"`;
});
// A literal "</script" inside the bundle would end the inline script tag early.
js = js.replace(/<\/script/gi, '<\\/script');

const page = `<title>Chakula Preview</title>
<style>
  html, body { height: 100%; }
  body { margin: 0; overflow: hidden; background: #E9E1D5; color: #1B4332; }
  #root { display: flex; flex: 1; height: 100%; position: relative; transform: translateZ(0); overflow: hidden; background: #FFF8F0; }
  #frame-label { display: none; }
  /* On a laptop or tablet, show the app inside a phone-sized frame. On a phone, use the whole screen. */
  @media (min-width: 560px) and (min-height: 640px) {
    body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
    #frame-label { display: block; font: 600 13px/1.4 system-ui, sans-serif; letter-spacing: 0.04em; color: #5B5A52; }
    #root {
      flex: none;
      height: min(844px, calc(100% - 72px));
      aspect-ratio: 390 / 844;
      border-radius: 44px;
      border: 10px solid #1B1F1C;
      box-shadow: 0 30px 60px rgba(27, 67, 50, 0.22);
    }
  }
</style>
<div id="frame-label">Chakula · student app preview · sample data</div>
<div id="root"></div>
<script>
  // Expo Router reads the page address to pick a screen. The preview host serves this file
  // from its own path, so start the app at the home route.
  try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}
</script>
<script>${js}</script>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, page);
rmSync(exportDir, { recursive: true, force: true });
console.log(`Wrote ${outFile} (${(page.length / 1024 / 1024).toFixed(2)} MB, ${inlined} assets inlined)`);
