// One-off utility. Renders docs/MRC_FULL_WALKTHROUGH.html to
// docs/MRC_FULL_WALKTHROUGH.pdf via Puppeteer. Not wired into CI — re-run
// manually when the HTML changes.
//
// Run:
//   npx tsx scripts/export-walkthrough-pdf.ts

import { launch } from 'puppeteer';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const HTML_PATH = resolve(process.cwd(), 'docs/MRC_FULL_WALKTHROUGH.html');
const PDF_PATH = resolve(process.cwd(), 'docs/MRC_FULL_WALKTHROUGH.pdf');
const MERMAID_TIMEOUT_MS = 15000;

const browser = await launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(HTML_PATH).toString(), { waitUntil: 'networkidle0' });

  // Wait for Mermaid to finish. It sets [data-processed] on each source block
  // once the SVG is inserted.
  await page.waitForFunction(
    () => document.querySelectorAll('pre.mermaid:not([data-processed])').length === 0,
    { timeout: MERMAID_TIMEOUT_MS }
  );

  await page.emulateMediaType('print');

  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: { top: '1.5cm', bottom: '1.5cm', left: '2cm', right: '2cm' },
    preferCSSPageSize: true,
  });

  console.log(`✓ Wrote ${PDF_PATH}`);
} finally {
  await browser.close();
}
