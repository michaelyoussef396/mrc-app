// Verifies the inspection report cover's EXAMINED AREAS backing panel renders
// in BOTH media types, at 3 / 10 / 20 rooms.
//
// Why this exists. The cover's info block has no fixed height, so a long area
// list grows down onto the navy diagonal and #252525 text on #121D73 becomes
// unreadable. The fix is a white backing panel. But the template's `@media
// print` block strips every div background by default
// (`div { background-color: transparent !important }`), and api/render-pdf.ts
// renders with emulateMediaType('print') — so a screen-only check passed while
// the shipped PDF was still broken. The print assertion below is the guard
// against repeating that.
//
// The panel's colour is #ffffff and the print allow-list matches that literal.
// `white` is deliberately NOT used: the cover photo's mount uses `background:
// white` and print strips it on purpose. This script asserts both halves — the
// panel opaque, the mount still stripped — so normalising the two colours
// together fails loudly instead of silently.
//
// Run:
//   npx tsx scripts/verify-pdf-cover-panel.ts [path/to/template.html]
//
// Defaults to the repo template. Pass a path to check a file downloaded from
// Storage — that is the copy that actually ships.

import { readFileSync, writeFileSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from 'puppeteer';

const TEMPLATE_PATH = resolve(
  process.cwd(),
  process.argv[2] ?? 'src/templates/inspection-report-template.html',
);
const ASSETS_DIR = resolve(process.cwd(), 'public/pages');

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const OPAQUE_WHITE = 'rgb(255, 255, 255)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const ROOM_COUNTS = [3, 10, 20];

const ROOMS = [
  'Kitchen', 'Master Bedroom', 'Bathroom', 'Laundry', 'Living Room',
  'Ensuite', 'Bedroom 2', 'Hallway', 'Dining Room', 'Study',
  'Bedroom 3', 'Garage', 'Rumpus Room', 'Walk In Robe', 'Powder Room',
  'Sunroom', 'Pantry', 'Linen Cupboard', 'Front Porch', 'Rear Deck',
];

const FIXTURES: Record<string, string> = {
  ordered_by: 'Sarah Thompson',
  inspector: 'Michael Youssef',
  inspection_date: '28/08/2026',
  directed_to: 'Sarah Thompson',
  property_type: 'Residential',
  property_address: '14 Bourke Street, Richmond VIC 3121',
  cover_photo_url: 'pages/page-1-cover/logo-bottom-right.png',
};

function buildCover(template: string, roomCount: number): string {
  const head = template.slice(0, template.indexOf('<body'));
  let cover = template.slice(
    template.indexOf('<!-- Page 1: Cover -->'),
    template.indexOf('<!-- Page 2: Value Proposition -->'),
  );
  for (const [key, value] of Object.entries(FIXTURES)) {
    cover = cover.replaceAll(`{{${key}}}`, value);
  }
  cover = cover
    .replaceAll('{{examined_areas}}', ROOMS.slice(0, roomCount).join(', ').toUpperCase())
    // Storage-absolute asset paths resolve against the symlinked pages/ dir.
    .replaceAll('src="/pages/', 'src="pages/');
  return `${head}<body>\n${cover}\n</body></html>\n`;
}

const template = readFileSync(TEMPLATE_PATH, 'utf8');
const workDir = mkdtempSync(join(tmpdir(), 'mrc-cover-'));
symlinkSync(ASSETS_DIR, join(workDir, 'pages'));

const browser = await launch({ headless: true });
let failures = 0;

try {
  for (const media of ['screen', 'print'] as const) {
    const page = await browser.newPage();
    await page.setViewport({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
    await page.emulateMediaType(media);

    for (const roomCount of ROOM_COUNTS) {
      const file = join(workDir, `cover-${media}-${roomCount}.html`);
      writeFileSync(file, buildCover(template, roomCount));
      await page.goto(pathToFileURL(file).toString(), { waitUntil: 'networkidle0' });

      const seen = await page.evaluate(() => {
        const divs = [...document.querySelectorAll('div')];
        const panel = divs.find(d => d.style.padding === '10px 12px');
        const mount = divs.find(d => d.style.boxShadow.includes('-16px'));
        return {
          panel: panel ? getComputedStyle(panel).backgroundColor : 'PANEL NOT FOUND',
          mount: mount ? getComputedStyle(mount).backgroundColor : 'MOUNT NOT FOUND',
        };
      });

      // The panel must be opaque in both media, or the room names sit
      // unreadable on the navy diagonal in whichever one it failed.
      const panelOk = seen.panel === OPAQUE_WHITE;
      // The allow-list must not have resurrected the photo mount, which print
      // strips deliberately.
      const mountOk = media === 'screen' || seen.mount === TRANSPARENT;
      if (!panelOk || !mountOk) failures++;

      console.log(
        `${panelOk && mountOk ? 'PASS' : 'FAIL'}  ${media.padEnd(6)} ` +
        `${String(roomCount).padStart(2)} rooms  panel=${seen.panel}  mount=${seen.mount}`,
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nAll assertions passed' : `\n${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
