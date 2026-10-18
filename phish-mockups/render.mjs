import { chromium } from "/Users/jana/.cache/deck-qa/node_modules/playwright-core/index.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../deck/assets/images");
const files = ["01-csdd","02-ibanka","03-vid","04-drive","05-harvest","06-atvalinajumi"];
let browser;
for (const channel of ["chrome","msedge",undefined]) { try { browser = await chromium.launch(channel?{channel}:{}); break; } catch {} }
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
for (const f of files) {
  await page.goto("file://" + path.join(here, f + ".html"));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, `phish-${f}.png`) });
  console.log("wrote", `phish-${f}.png`);
}
await browser.close();
